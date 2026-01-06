import { Telegraf, Markup } from 'telegraf';
import { Product } from '../models/Product.js';
import { Category } from '../models/index.js';
import { Order } from '../models/Order.js';

// Mapa temporal para guardar carritos de usuarios en memoria
// Estructura: { chatId: { items: [], type: 'takeout' } }
const userSessions = new Map();

export const initTelegramBot = (token) => {
    if (!token) {
        console.warn('⚠️ No se proporcionó TELEGRAM_BOT_TOKEN. El bot no se iniciará.');
        return null;
    }

    const bot = new Telegraf(token);

    // --- BIENVENIDA ---
    bot.start((ctx) => {
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

    // --- MANEJO DE CATEGORÍAS (Callback) ---
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

    // --- AÑADIR AL CARRITO (Callback) ---
    bot.action(/^prod_(\d+)$/, async (ctx) => {
        const prodId = ctx.match[1];
        const product = Product.getById(prodId);
        const chatId = ctx.chat.id;

        if (!userSessions.has(chatId)) {
            userSessions.set(chatId, { items: [] });
        }

        const session = userSessions.get(chatId);
        session.items.push({
            productId: product.id,
            productName: product.name,
            quantity: 1,
            totalPrice: product.basePrice,
            unitPrice: product.basePrice,
            selectedModifiers: [],
            comboSelections: [],
            notes: '',
            status: 'pending'
        });

        await ctx.answerCbQuery(`✅ ${product.name} añadido.`);
        await ctx.reply(`Añadiste *${product.name}* al carrito. ¿Quieres algo más?`, { parse_mode: 'Markdown' });
    });

    // --- VER CARRITO ---
    const viewCart = (ctx) => {
        const chatId = ctx.chat.id;
        const session = userSessions.get(chatId);

        if (!session || session.items.length === 0) {
            return ctx.reply('Tu carrito está vacío. 🛒');
        }

        let total = 0;
        let summary = '*Tu Pedido:* \n\n';
        session.items.forEach((item, index) => {
            summary += `${index + 1}. ${item.productName} - $${item.unitPrice.toLocaleString()}\n`;
            total += item.unitPrice;
        });

        summary += `\n*TOTAL: $${total.toLocaleString()}*`;
        ctx.reply(summary, { parse_mode: 'Markdown' });
    };

    bot.hears('🛒 Mi Carrito', viewCart);

    // --- VACIAR CARRITO ---
    bot.hears('❌ Vaciar Carrito', (ctx) => {
        userSessions.set(ctx.chat.id, { items: [] });
        ctx.reply('Carrito vaciado. 🗑️');
    });

    // --- FINALIZAR PEDIDO ---
    bot.hears('✅ Finalizar Pedido', async (ctx) => {
        const chatId = ctx.chat.id;
        const session = userSessions.get(chatId);

        if (!session || session.items.length === 0) {
            return ctx.reply('No tienes productos para pedir. 🧐');
        }

        try {
            const total = session.items.reduce((sum, i) => sum + i.totalPrice, 0);
            
            // Crear la orden en la base de datos
            const orderData = {
                type: 'takeout', // Por defecto para el bot
                customerName: ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : ''),
                items: session.items,
                subtotal: total,
                total: total,
                status: 'pending',
                paymentStatus: 'pending',
                notes: `Pedido desde Telegram por @${ctx.from.username || 'user'}`
            };

            const newOrder = Order.create(orderData);
            
            userSessions.set(chatId, { items: [] }); // Limpiar carrito

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
