import { Telegraf, Markup } from 'telegraf';
import { Product } from '../models/Product.js';
import { Category } from '../models/index.js';
import { Order } from '../models/Order.js';

// Mapa temporal para guardar carritos y estados de usuarios en memoria
// Estructura: { chatId: { items: [], draftItem: null, state: 'idle' } }
const userSessions = new Map();

export const initTelegramBot = (token) => {
    if (!token) {
        console.warn('⚠️ No se proporcionó TELEGRAM_BOT_TOKEN. El bot no se iniciará.');
        return null;
    }

    const bot = new Telegraf(token);

    // Helper para obtener/crear sesión
    const getSession = (chatId) => {
        if (!userSessions.has(chatId)) {
            userSessions.set(chatId, { items: [], draftItem: null, state: 'idle' });
        }
        return userSessions.get(chatId);
    };

    // --- BIENVENIDA ---
    bot.start((ctx) => {
        const session = getSession(ctx.chat.id);
        session.state = 'idle';
        
        const welcomeMsg = `¡Bienvenido a Malulos! 🍔🥤\n\n¿Tienes hambre? Haz tu pedido directamente por aquí.\n\nUsa los botones de abajo para navegar.`;
        return ctx.reply(welcomeMsg, Markup.keyboard([
            ['📖 Ver Menú', '🛒 Mi Carrito'],
            ['✅ Finalizar Pedido', '❌ Vaciar Carrito']
        ]).resize());
    });

    // --- MOSTRAR CATEGORÍAS ---
    const showMenu = async (ctx) => {
        const categories = Category.getAll().filter(c => c.isActive);
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `cat_${cat.id}`)]);
        
        await ctx.reply('Selecciona una categoría:', Markup.inlineKeyboard(buttons));
    };

    bot.hears('📖 Ver Menú', showMenu);
    bot.command('menu', showMenu);

    // --- MANEJO DE CATEGORÍAS ---
    bot.action(/^cat_(\d+)$/, async (ctx) => {
        const catId = ctx.match[1];
        const products = Product.getByCategory(catId).filter(p => p.isActive);
        
        if (products.length === 0) {
            return ctx.answerCbQuery('No hay productos en esta categoría.');
        }

        const buttons = products.map(p => [Markup.button.callback(`${p.name} - $${p.basePrice.toLocaleString()}`, `prod_${p.id}`)]);
        buttons.push([Markup.button.callback('⬅️ Volver a categorías', 'back_to_cats')]);

        await ctx.editMessageText('Elige un producto:', Markup.inlineKeyboard(buttons));
    });

    bot.action('back_to_cats', async (ctx) => {
        const categories = Category.getAll().filter(c => c.isActive);
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `cat_${cat.id}`)]);
        await ctx.editMessageText('Selecciona una categoría:', Markup.inlineKeyboard(buttons));
    });

    // --- CONFIGURAR PRODUCTO (Adiciones y Notas) ---
    const showProductConfig = async (ctx, session) => {
        const p = session.draftItem;
        let text = `*${p.productName}*\n`;
        text += `Precio base: $${p.unitPrice.toLocaleString()}\n\n`;
        
        if (p.selectedModifiers.length > 0) {
            text += `*Adiciones:*\n${p.selectedModifiers.map(m => `+ ${m.name} ($${m.priceModifier.toLocaleString()})`).join('\n')}\n`;
        }
        
        if (p.notes) {
            text += `\n*Nota:* ${p.notes}\n`;
        }

        text += `\n*Subtotal ítem: $${p.totalPrice.toLocaleString()}*`;

        const buttons = [];
        
        // Botones para modificadores (si existen en el producto real)
        const fullProduct = Product.getById(p.productId);
        if (fullProduct.modifierGroups && fullProduct.modifierGroups.length > 0) {
            fullProduct.modifierGroups.forEach((group, gIdx) => {
                group.modifiers.forEach((mod, mIdx) => {
                    const isSelected = p.selectedModifiers.find(m => m.id === mod.id);
                    const label = `${isSelected ? '✅' : '+'} ${mod.name} ($${mod.priceModifier.toLocaleString()})`;
                    buttons.push([Markup.button.callback(label, `mod_${gIdx}_${mIdx}`)]);
                });
            });
        }

        buttons.push([Markup.button.callback('📝 Agregar Nota', 'add_note')]);
        buttons.push([Markup.button.callback('🛒 AÑADIR AL CARRITO', 'confirm_item')]);
        buttons.push([Markup.button.callback('❌ Cancelar', 'back_to_cats')]);

        if (ctx.callbackQuery) {
            await ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
        } else {
            await ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
        }
    };

    bot.action(/^prod_(\d+)$/, async (ctx) => {
        const prodId = ctx.match[1];
        const product = Product.getById(prodId);
        const session = getSession(ctx.chat.id);

        session.draftItem = {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.basePrice,
            totalPrice: product.basePrice,
            selectedModifiers: [],
            comboSelections: [],
            notes: '',
            status: 'pending'
        };

        await ctx.answerCbQuery();
        await showProductConfig(ctx, session);
    });

    // Toggle de Modificadores
    bot.action(/^mod_(\d+)_(\d+)$/, async (ctx) => {
        const gIdx = parseInt(ctx.match[1]);
        const mIdx = parseInt(ctx.match[2]);
        const session = getSession(ctx.chat.id);
        
        if (!session.draftItem) return ctx.answerCbQuery();

        const product = Product.getById(session.draftItem.productId);
        const modifier = product.modifierGroups[gIdx].modifiers[mIdx];
        
        const existingIdx = session.draftItem.selectedModifiers.findIndex(m => m.id === modifier.id);
        
        if (existingIdx > -1) {
            session.draftItem.selectedModifiers.splice(existingIdx, 1);
            session.draftItem.totalPrice -= modifier.priceModifier;
        } else {
            session.draftItem.selectedModifiers.push(modifier);
            session.draftItem.totalPrice += modifier.priceModifier;
        }

        await ctx.answerCbQuery();
        await showProductConfig(ctx, session);
    });

    // Iniciar captura de nota
    bot.action('add_note', async (ctx) => {
        const session = getSession(ctx.chat.id);
        session.state = 'awaiting_note';
        await ctx.answerCbQuery();
        await ctx.reply('Escribe la nota para este producto (ej: "Sin salsa de tomate"):');
    });

    // Confirmar ítem al carrito
    bot.action('confirm_item', async (ctx) => {
        const session = getSession(ctx.chat.id);
        if (!session.draftItem) return;

        session.items.push({...session.draftItem});
        const name = session.draftItem.productName;
        session.draftItem = null;
        session.state = 'idle';

        await ctx.answerCbQuery('✅ Añadido al carrito');
        await ctx.editMessageText(`✅ *${name}* se añadió a tu pedido.\n\n¿Quieres pedir algo más? Usa el botón "Ver Menú" o finaliza tu pedido.`, { parse_mode: 'Markdown' });
    });

    // Manejo de mensajes de texto (para notas y otros)
    bot.on('text', async (ctx, next) => {
        const session = getSession(ctx.chat.id);
        
        if (session.state === 'awaiting_note' && session.draftItem) {
            session.draftItem.notes = ctx.message.text;
            session.state = 'idle';
            await ctx.reply('Nota guardada. ✅');
            await showProductConfig(ctx, session);
            return;
        }
        
        return next();
    });

    // --- VER CARRITO ---
    const viewCart = (ctx) => {
        const session = getSession(ctx.chat.id);

        if (!session || session.items.length === 0) {
            return ctx.reply('Tu carrito está vacío. 🛒');
        }

        let total = 0;
        let summary = '*Tu Pedido:* \n\n';
        session.items.forEach((item, index) => {
            summary += `${index + 1}. *${item.productName}*\n`;
            if (item.selectedModifiers.length > 0) {
                summary += `   _Adiciones: ${item.selectedModifiers.map(m => m.name).join(', ')}_\n`;
            }
            if (item.notes) {
                summary += `   _Nota: ${item.notes}_\n`;
            }
            summary += `   Precio: $${item.totalPrice.toLocaleString()}\n\n`;
            total += item.totalPrice;
        });

        summary += `\n*TOTAL: $${total.toLocaleString()}*`;
        ctx.reply(summary, { parse_mode: 'Markdown' });
    };

    bot.hears('🛒 Mi Carrito', viewCart);

    // --- VACIAR CARRITO ---
    bot.hears('❌ Vaciar Carrito', (ctx) => {
        const session = getSession(ctx.chat.id);
        session.items = [];
        session.draftItem = null;
        session.state = 'idle';
        ctx.reply('Carrito vaciado. 🗑️');
    });

    // --- FINALIZAR PEDIDO ---
    bot.hears('✅ Finalizar Pedido', async (ctx) => {
        const session = getSession(ctx.chat.id);

        if (!session || session.items.length === 0) {
            return ctx.reply('No tienes productos para pedir. 🧐');
        }

        try {
            const total = session.items.reduce((sum, i) => sum + i.totalPrice, 0);
            
            // Crear la orden en la base de datos
            const orderData = {
                type: 'takeout', 
                customerName: ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : ''),
                items: session.items,
                subtotal: total,
                total: total,
                status: 'pending',
                paymentStatus: 'pending',
                origin: 'telegram',
                notes: `Pedido Telegram por @${ctx.from.username || 'user'}`
            };

            const newOrder = Order.create(orderData);
            
            session.items = []; // Limpiar carrito

            ctx.reply(`¡Pedido recibido con éxito! 🎉\n\nTu número de orden es: *${newOrder.orderNumber}*\n\nTe avisaremos cuando esté listo.`, { parse_mode: 'Markdown' });
            
            console.log(`🤖 Bot: Nuevo pedido ${newOrder.orderNumber} desde Telegram.`);
        } catch (error) {
            console.error('Error al crear orden desde bot:', error);
            ctx.reply('Lo sentimos, hubo un error al procesar tu pedido. Por favor intenta más tarde.');
        }
    });

    bot.launch();
    console.log('🤖 Telegram Bot activo y listo para recibir pedidos.');

    return bot;
};
