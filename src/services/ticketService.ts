import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Order, AppConfig } from '@/types'

export const generateTicketPDF = (order: Order, config: AppConfig) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 200] // Formato ticket térmico 80mm
    })

    const width = doc.internal.pageSize.getWidth()
    let y = 10

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    const businessName = config?.businessName || 'Malulos'
    doc.text(businessName, width / 2, y, { align: 'center' })

    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('TICKET DE VENTA', width / 2, y, { align: 'center' })

    y += 4
    doc.text(`Orden: ${order.orderNumber}`, width / 2, y, { align: 'center' })

    y += 4
    doc.text(`Fecha: ${new Date(order.completedAt || order.createdAt).toLocaleString()}`, width / 2, y, { align: 'center' })

    y += 2
    doc.line(5, y, width - 5, y)
    y += 5

    // Items Table
    const tableData = order.items.map(item => [
        `${item.quantity}x ${item.productName}`,
        `$${item.totalPrice.toLocaleString()}`
    ])

    autoTable(doc, {
        startY: y,
        theme: 'plain',
        margin: { left: 5, right: 5 },
        body: tableData,
        styles: { fontSize: 8, cellPadding: 1 },
        columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 25, halign: 'right' }
        }
    })

    y = (doc as any).lastAutoTable.finalY + 5

    // Totals
    doc.line(5, y, width - 5, y)
    y += 5

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', 5, y)
    doc.text(`$${order.total.toLocaleString()}`, width - 5, y, { align: 'right' })

    if (order.paymentMethod === 'cash') {
        y += 5
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text('Recibido:', 5, y)
        doc.text(`$${(order.paidAmount || 0).toLocaleString()}`, width - 5, y, { align: 'right' })

        y += 4
        doc.text('Cambio:', 5, y)
        doc.text(`$${((order.paidAmount || 0) - order.total).toLocaleString()}`, width - 5, y, { align: 'right' })
    }

    y += 8
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text('¡Gracias por tu compra!', width / 2, y, { align: 'center' })

    y += 4
    doc.text('Malulos POS - By Antigravity', width / 2, y, { align: 'center' })

    // Guardar archivo
    doc.save(`Ticket_${order.orderNumber}.pdf`)
}

/**
 * Genera un ticket simplificado para cocina (Comanda)
 */
export const generateKitchenTicket = (order: Order) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 150] // Formato ticket térmico corto
    })

    const width = doc.internal.pageSize.getWidth()
    let y = 10

    // Header Cocina
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('COMANDA - COCINA', width / 2, y, { align: 'center' })

    y += 8
    doc.setFontSize(12)
    doc.text(`ORDEN: ${order.orderNumber}`, width / 2, y, { align: 'center' })

    y += 6
    doc.setFontSize(10)
    const typeLabel = order.type === 'dine-in' ? `MESA: ${order.tableName || order.tableId}` :
                     order.type === 'takeout' ? 'PARA LLEVAR' : 'DOMICILIO'
    doc.text(typeLabel, width / 2, y, { align: 'center' })

    y += 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Hora: ${new Date().toLocaleTimeString()}`, width / 2, y, { align: 'center' })

    y += 2
    doc.line(5, y, width - 5, y)
    y += 5

    // Items (Sin precios)
    const tableData = order.items.map(item => [
        `${item.quantity}x`,
        `${item.productName}${item.selectedSize ? ` (${item.selectedSize.name})` : ''}\n${item.selectedModifiers.map(m => `+ ${m.name}`).join('\n')}${item.notes ? `\n*NOTA: ${item.notes}*` : ''}`
    ])

    autoTable(doc, {
        startY: y,
        theme: 'plain',
        margin: { left: 5, right: 5 },
        body: tableData,
        styles: { fontSize: 10, cellPadding: 1, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 60 }
        }
    })

    // Guardar archivo
    doc.save(`Comanda_${order.orderNumber}.pdf`)
}
