import { Telegraf, Markup } from 'telegraf';
import { randomUUID } from 'crypto';
import { Product } from '../models/Product.js';
import { Category, Customer } from '../models/index.js';
import { Order } from '../models/Order.js';

const userSessions = new Map();
let botInstance = null;

export const initTelegramBot = (token) => {
    if (!token) return null;
    const bot = new Telegraf(token);
    botInstance = bot;

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
        let welcomeMsg = `\u00A1Bienvenido a Malulos! \u{1F354}\n\n`;
        if (session.customer) welcomeMsg += `Hola de nuevo, *${session.customer.name}*. \u{1F44B}`;
        else {
            welcomeMsg += `Parece que es tu primera vez por aqu\u00ED. \u{1F60A}\nPara empezar, por favor dinos tu nombre completo:`;
            session.state = 'register_name';
        }
        return ctx.reply(welcomeMsg, { parse_mode: 'Markdown', ...Markup.keyboard([['\u{1F4D6} Ver Men\u00FA', '\u{1F6D2} Mi Carrito'], ['\u{2705} Finalizar Pedido', '\u{274C} Vaciar Carrito']]).resize() });
    });

    bot.on('text', async (ctx, next) => {
        const session = getSession(ctx.chat.id);
        if (session.state === 'register_name') {
            session.tempCustomer = { name: ctx.message.text, telegramId: String(ctx.chat.id) };
            session.state = 'register_phone';
            return ctx.reply(`Mucho gusto, ${ctx.message.text}. \u{1F44B}\n\u00BFCu\u00E1l es tu n\u00FAmero de tel\u00E9fono?`);
        }
        if (session.state === 'register_phone') {
            session.tempCustomer.phone = ctx.message.text;
            session.state = 'register_address';
            return ctx.reply(`\u00A1Gracias! Por \u00FAltimo, \u00BFa qu\u00E9 direcci\u00F3n enviamos tus pedidos? \u{1F4CD}`);
        }
        if (session.state === 'register_address') {
            session.tempCustomer.address = ctx.message.text;
            session.customer = await Customer.create(session.tempCustomer);
            session.state = 'idle';
            return ctx.reply(`\u00A1Registro completado! \u{1F389} Ya puedes pedir con /menu.`);
        }
        if (session.state === 'awaiting_note' && session.draftItem) {
            session.draftItem.notes = ctx.message.text;
            session.state = 'idle';
            await ctx.reply('Nota guardada. \u{2705}');
            await showProductConfig(ctx, session);
            return;
        }
        return next();
    });

    const showMenu = async (ctx) => {
        const categories = (await Category.getAll()).filter(c => c.isActive);
        const buttons = categories.map(cat => [Markup.button.callback(cat.name, `cat_${cat.id}`)]);
        await ctx.reply('Selecciona una categor\u00EDa:', Markup.inlineKeyboard(buttons));
    };

    bot.hears('\u{1F4D6} Ver Men\u00FA', showMenu);
    bot.command('menu', showMenu);

    bot.action(/^cat_(\d+)$/, async (ctx) => {
        const catId = ctx.match[1];
        const products = (await Product.getByCategory(catId)).filter(p => p.isActive);
        if (products.length === 0) return ctx.answerCbQuery('No hay productos aqu\u00ED.');
        const buttons = products.map(p => [Markup.button.callback(`${p.name} - $${p.basePrice.toLocaleString()}`, `prod_${p.id}`)]);
        buttons.push([Markup.button.callback('\u{2B05}\u{FE0F} Volver', 'back_to_cats')]);
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
                    buttons.push([Markup.button.callback(`${isSelected ? '\u{2705}' : '+'} ${mod.name}`, `mod_${gIdx}_${mIdx}`)]);
                });
            });
        }
        buttons.push([Markup.button.callback('\u{1F4DD} Agregar Nota', 'add_note')]);
        buttons.push([Markup.button.callback('\u{1F6D2} A\u00D1ADIR AL CARRITO', 'confirm_item')]);
        buttons.push([Markup.button.callback('\u{274C} Cancelar', 'back_to_cats')]);
        if (ctx.callbackQuery) await ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
        else await ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    };

    bot.action(/^prod_(\d+)$/, async (ctx) => {
        const product = await Product.getById(ctx.match[1]);
        const session = getSession(ctx.chat.id);
        session.draftItem = {
            id: randomUUID(),
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
        await ctx.answerCbQuery('\u{2705} A\u00F1adido');
        await ctx.reply(`\u{2705} *${name}* a\u00F1adido.`, { parse_mode: 'Markdown' });
    });

    bot.action(/^cancel_order_(\d+)$/, async (ctx) => {
        const orderId = Number(ctx.match[1]);
        if (!Number.isFinite(orderId)) return ctx.answerCbQuery('Pedido invalido');

        const session = getSession(ctx.chat.id);
        if (!session.customer) {
            session.customer = await Customer.getByTelegramId(String(ctx.chat.id));
        }

        const order = await Order.getById(orderId);
        if (!order) return ctx.answerCbQuery('Pedido no encontrado');

        if (order.origin !== 'telegram') {
            return ctx.answerCbQuery('No se puede cancelar este pedido');
        }

        if (!session.customer || order.customerId !== session.customer.id) {
            return ctx.answerCbQuery('No autorizado');
        }

        if (order.paymentStatus === 'paid') {
            return ctx.answerCbQuery('Pedido ya pagado');
        }

        if (order.status !== 'pending') {
            return ctx.answerCbQuery('Pedido en proceso');
        }

        await Order.update(orderId, { status: 'cancelled' });

        await ctx.answerCbQuery('Pedido cancelado');
        const message = `Pedido *${order.orderNumber}* cancelado.`;
        try {
            await ctx.editMessageText(message, { parse_mode: 'Markdown' });
        } catch {
            await ctx.reply(message, { parse_mode: 'Markdown' });
        }
    });

    bot.hears('\u{1F6D2} Mi Carrito', (ctx) => {
        const session = getSession(ctx.chat.id);
        if (!session.items.length) return ctx.reply('Carrito vac\u00EDo. \u{1F6D2}');
        let total = 0, summary = '*Tu Pedido:* \n\n';
        session.items.forEach((item, i) => {
            summary += `${i + 1}. *${item.productName}* - $${item.totalPrice.toLocaleString()}\n`;
            total += item.totalPrice;
        });
        summary += `\n*TOTAL: $${total.toLocaleString()}*`;
        ctx.reply(summary, { parse_mode: 'Markdown' });
    });

    bot.hears('\u{274C} Vaciar Carrito', (ctx) => {
        const session = getSession(ctx.chat.id);
        session.items = [];
        ctx.reply('Carrito vaciado. \u{1F5D1}\u{FE0F}');
    });

    bot.hears('\u{2705} Finalizar Pedido', async (ctx) => {
        const session = getSession(ctx.chat.id);
        if (!session.items.length) return ctx.reply('No tienes productos. \u{1F9D0}');
        if (!session.customer) {
            session.state = 'register_name';
            return ctx.reply('Por favor dinos tu nombre completo para registrarte:');
        }

        // Mostrar resumen y preguntar m\u00E9todo de pago
        const total = session.items.reduce((sum, i) => sum + i.totalPrice, 0);
        let summary = '*Resumen de tu Pedido:*\n\n';
        session.items.forEach((item, i) => {
            summary += `${i + 1}. ${item.productName} - $${item.totalPrice.toLocaleString()}\n`;
        });
        summary += `\n*TOTAL: $${total.toLocaleString()}*\n\n\u00BFC\u00F3mo vas a pagar?`;

        const paymentButtons = [
            [Markup.button.callback('\u{1F4F1} Nequi', 'payment_nequi')],
            [Markup.button.callback('\u{1F4B0} DaviPlata', 'payment_daviplata')],
            [Markup.button.callback('\u{1F3E6} Transferencia Bancaria', 'payment_transfer')],
            [Markup.button.callback('\u{1F4B5} Contraentrega (Efectivo)', 'payment_contraentrega')]
        ];

        session.state = 'awaiting_payment_method';
        await ctx.reply(summary, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(paymentButtons)
        });
    });

    // Manejar selecci\u00F3n de m\u00E9todo de pago
    bot.action(/^payment_(.+)$/, async (ctx) => {
        const session = getSession(ctx.chat.id);
        if (session.state !== 'awaiting_payment_method') return ctx.answerCbQuery();

        const paymentMethod = ctx.match[1];

        try {
            const total = session.items.reduce((sum, i) => sum + i.totalPrice, 0);
            let orderNotes = `Pedido por @${ctx.from.username || 'user'}`;

            // Crear orden seg\u00FAn el m\u00E9todo de pago
            const orderData = {
                type: 'delivery',
                customerId: session.customer.id,
                customerName: session.customer.name,
                customerPhone: session.customer.phone,
                customerAddress: session.customer.address,
                items: session.items,
                subtotal: total,
                total: total,
                status: 'pending',
                paymentStatus: 'pending',
                paymentMethod: paymentMethod === 'contraentrega' ? 'cash' : paymentMethod,
                origin: 'telegram',
                notes: orderNotes
            };

            const newOrder = await Order.create(orderData);
            session.items = [];
            session.state = 'idle';

            let responseMsg = `\u00A1Gracias *${session.customer.name}*! \u{1F389}\n\nOrden: *${newOrder.orderNumber}*\nTotal: *$${total.toLocaleString()}*\n\n`;
            const cancelButtons = Markup.inlineKeyboard([
                [Markup.button.callback('Cancelar pedido', `cancel_order_${newOrder.id}`)]
            ]);

            if (paymentMethod === 'contraentrega') {
                responseMsg += `\u{2705} *Pago: Contraentrega*\nPagar\u00E1s en efectivo cuando recibas tu pedido. \u{1F4B5}\n\nEstamos preparando tu orden. \u{1F468}\u{200D}\u{1F373}`;
            } else {
                const methodNames = {
                    nequi: 'Nequi \u{1F4F1}',
                    daviplata: 'DaviPlata \u{1F4B0}',
                    transfer: 'Transferencia Bancaria \u{1F3E6}'
                };

                responseMsg += `*M\u00E9todo de Pago:* ${methodNames[paymentMethod]}\n\n`;
                responseMsg += `\u{1F4F8} *Por favor env\u00EDa el comprobante de pago* al administrador para confirmar tu pedido.\n\n`;
                responseMsg += `Una vez confirmado el pago, comenzaremos a preparar tu orden. \u{1F468}\u{200D}\u{1F373}`;
            }

            await ctx.answerCbQuery('\u{2705} Pedido creado');
            await ctx.editMessageText(responseMsg, { parse_mode: 'Markdown', ...cancelButtons });

        } catch (error) {
            console.error('Error creating order:', error);
            await ctx.answerCbQuery('\u{274C} Error');
            await ctx.reply('Error al procesar pedido. Por favor intenta de nuevo.');
            session.state = 'idle';
        }
    });

    bot.launch();
    console.log('\u{1F916} Telegram Bot sincronizado con PostgreSQL.');
    return bot;
};

export const notifyTelegramCustomer = async (telegramId, message) => {
    if (!botInstance || !telegramId) return false;
    try {
        await botInstance.telegram.sendMessage(String(telegramId), message, { parse_mode: 'Markdown' });
        return true;
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
        return false;
    }
};

