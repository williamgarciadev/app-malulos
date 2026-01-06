import { Telegraf, Markup } from 'telegraf';
import { Product } from '../models/Product.js';
import { Category, Customer } from '../models/index.js';
import { Order } from '../models/Order.js';

const userSessions = new Map();

export const initTelegramBot = (token) => {
    if (!token) return null;
    const bot = new Telegraf(token);

    const getSession = (chatId) => {
        if (!userSessions.has(chatId)) {
            userSessions.set(chatId, { items: [], draftItem: null, state: 'idle', customer: null });
        }
        return userSessions.get(chatId);
    };

    bot.use(async (ctx, next) => {
        if (!ctx.chat) return next();
        const session = getSession(ctx.chat.id);
        if (!session.customer) {
            const customer = await Customer.getByTelegramId(String(ctx.chat.id));
            if (customer) session.customer = customer;
        }
        return next();
    });

    bot.start(async (ctx) => {
        const session = getSession(ctx.chat.id);
        session.state = 'idle';
        let welcomeMsg = `¡Bienvenido a Malulos! 🍔\n\n`;
        if (session.customer) welcomeMsg += `Hola de nuevo, *${session.customer.name}*. 👋`;
        else {
            welcomeMsg += `Parece que es tu primera vez por aquí. 😊\nPara empezar, por favor dinos tu nombre completo:`;
            session.state = 'register_name';
        }
        return ctx.reply(welcomeMsg, { parse_mode: 'Markdown', ...Markup.keyboard([['📖 Ver Menú', '🛒 Mi Carrito'], ['✅ Finalizar Pedido', '❌ Vaciar Carrito']]).resize() });
    });

    bot.on('text', async (ctx, next) => {
        const session = getSession(ctx.chat.id);
        if (session.state === 'register_name') {
            session.tempCustomer = { name: ctx.message.text, telegramId: String(ctx.chat.id) };
            session.state = 'register_phone';
            return ctx.reply(`Mucho gusto, ${ctx.message.text}. 👋\n¿Cuál es tu número de teléfono?`);
        }
        if (session.state === 'register_phone') {
            session.tempCustomer.phone = ctx.message.text;
            session.state = 'register_address';
            return ctx.reply(`¡Gracias! Por último, ¿a qué dirección enviamos tus pedidos? 📍`);
        }
        if (session.state === 'register_address') {
            session.tempCustomer.address = ctx.message.text;
            session.customer = await Customer.create(session.tempCustomer);
            session.state = 'idle';
            return ctx.reply(`¡Registro completado! 🎉 Ya puedes pedir con /menu.`);
        }
        if (session.state === 'awaiting_note' && session.draftItem) {
            session.draftItem.notes = ctx.message.text;
            session.state = 'idle';
            await ctx.reply('Nota guardada. ✅');
            await showProductConfig(ctx, session);
            return;
        }
        return next();
    });

    const showMenu = async (ctx) => {
        const categories = (await Category.getAll()).filter(c => c.isActive);
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `cat_${cat.id}`)]);
        await ctx.reply('Selecciona una categoría:', Markup.inlineKeyboard(buttons));
    };

    bot.hears('📖 Ver Menú', showMenu);
    bot.command('menu', showMenu);

    bot.action(/^cat_(\d+)$/, async (ctx) => {
        const catId = ctx.match[1];
        const products = (await Product.getByCategory(catId)).filter(p => p.isActive);
        if (products.length === 0) return ctx.answerCbQuery('No hay productos aquí.');
        const buttons = products.map(p => [Markup.button.callback(`${p.name} - $${p.basePrice.toLocaleString()}`, `prod_${p.id}`)]);
        buttons.push([Markup.button.callback('⬅️ Volver', 'back_to_cats')]);
        await ctx.editMessageText('Elige un producto:', Markup.inlineKeyboard(buttons));
    });

    bot.action('back_to_cats', showMenu);

    const showProductConfig = async (ctx, session) => {
        const p = session.draftItem;
        let text = `*${p.productName}*\nBase: $${p.unitPrice.toLocaleString()}\n`;
        if (p.selectedModifiers.length > 0) text += `+ Adiciones: ${p.selectedModifiers.map(m => m.name).join(', ')}\n`;
        if (p.notes) text += `Nota: ${p.notes}\n`;
        text += `\n*Subtotal: $${p.totalPrice.toLocaleString()}*`;

        const buttons = [];
        const fullProduct = await Product.getById(p.productId);
        if (fullProduct.modifierGroups) {
            fullProduct.modifierGroups.forEach((group, gIdx) => {
                group.modifiers.forEach((mod, mIdx) => {
                    const isSelected = p.selectedModifiers.find(m => m.id === mod.id);
                    buttons.push([Markup.button.callback(`${isSelected ? '✅' : '+'} ${mod.name}`, `mod_${gIdx}_${mIdx}`)]);
                });
            });
        }
        buttons.push([Markup.button.callback('📝 Agregar Nota', 'add_note')]);
        buttons.push([Markup.button.callback('🛒 AÑADIR AL CARRITO', 'confirm_item')]);
        buttons.push([Markup.button.callback('❌ Cancelar', 'back_to_cats')]);
        if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
        else await ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    };

    bot.action(/^prod_(\d+)$/, async (ctx) => {
        const product = await Product.getById(ctx.match[1]);
        const session = getSession(ctx.chat.id);
        session.draftItem = { productId: product.id, productName: product.name, quantity: 1, unitPrice: product.basePrice, totalPrice: product.basePrice, selectedModifiers: [], comboSelections: [], notes: '', status: 'pending' };
        await ctx.answerCbQuery();
        await showProductConfig(ctx, session);
    });

    bot.action(/^mod_(\d+)_(\d+)$/, async (ctx) => {
        const gIdx = parseInt(ctx.match[1]), mIdx = parseInt(ctx.match[2]);
        const session = getSession(ctx.chat.id);
        if (!session.draftItem) return ctx.answerCbQuery();
        const product = await Product.getById(session.draftItem.productId);
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

    bot.action('add_note', async (ctx) => {
        const session = getSession(ctx.chat.id);
        session.state = 'awaiting_note';
        await ctx.answerCbQuery();
        await ctx.reply('Escribe la nota para este producto:');
    });

    bot.action('confirm_item', async (ctx) => {
        const session = getSession(ctx.chat.id);
        if (!session.draftItem) return;
        session.items.push({...session.draftItem});
        const name = session.draftItem.productName;
        session.draftItem = null;
        await ctx.answerCbQuery('✅ Añadido');
        await ctx.reply(`✅ *${name}* añadido.`, { parse_mode: 'Markdown' });
    });

    bot.hears('🛒 Mi Carrito', (ctx) => {
        const session = getSession(ctx.chat.id);
        if (!session.items.length) return ctx.reply('Carrito vacío. 🛒');
        let total = 0, summary = '*Tu Pedido:* \n\n';
        session.items.forEach((item, i) => {
            summary += `${i + 1}. *${item.productName}* - $${item.totalPrice.toLocaleString()}\n`;
            total += item.totalPrice;
        });
        summary += `\n*TOTAL: $${total.toLocaleString()}*`;
        ctx.reply(summary, { parse_mode: 'Markdown' });
    });

    bot.hears('❌ Vaciar Carrito', (ctx) => {
        const session = getSession(ctx.chat.id);
        session.items = [];
        ctx.reply('Carrito vaciado. 🗑️');
    });

    bot.hears('✅ Finalizar Pedido', async (ctx) => {
        const session = getSession(ctx.chat.id);
        if (!session.items.length) return ctx.reply('No tienes productos. 🧐');
        if (!session.customer) {
            session.state = 'register_name';
            return ctx.reply('Por favor dinos tu nombre completo para registrarte:');
        }
        try {
            const total = session.items.reduce((sum, i) => sum + i.totalPrice, 0);
            const orderData = { type: 'takeout', customerId: session.customer.id, customerName: session.customer.name, customerPhone: session.customer.phone, customerAddress: session.customer.address, items: session.items, subtotal: total, total: total, status: 'pending', paymentStatus: 'pending', origin: 'telegram', notes: `Pedido por @${ctx.from.username || 'user'}` };
            const newOrder = await Order.create(orderData);
            session.items = [];
            ctx.reply(`¡Gracias *${session.customer.name}*! 🎉\nOrden: *${newOrder.orderNumber}*`, { parse_mode: 'Markdown' });
        } catch (error) {
            ctx.reply('Error al procesar pedido.');
        }
    });

    bot.launch();
    console.log('🤖 Telegram Bot sincronizado con PostgreSQL.');
    return bot;
};
