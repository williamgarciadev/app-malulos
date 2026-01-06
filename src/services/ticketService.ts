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
    doc.text(config.businessName, width / 2, y, { align: 'center' })

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
