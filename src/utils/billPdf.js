import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { templateBase64, templateMime } from './invoiceTemplate';

// This is sometimes needed in Vite to ensure autoTable is attached to jsPDF
// autoTable(doc, options) is safer than doc.autoTable(options)

export function numberToWords(n) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (n === 0) return 'Zero';
    const num = Math.floor(n);
    const fn = (x) => {
        if (x < 20) return ones[x];
        if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
        if (x < 1000) return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + fn(x % 100) : '');
        if (x < 100000) return fn(Math.floor(x / 1000)) + ' Thousand' + (x % 1000 ? ' ' + fn(x % 1000) : '');
        if (x < 10000000) return fn(Math.floor(x / 100000)) + ' Lakh' + (x % 100000 ? ' ' + fn(x % 100000) : '');
        return fn(Math.floor(x / 10000000)) + ' Crore' + (x % 10000000 ? ' ' + fn(x % 10000000) : '');
    };
    return fn(num) + ' Rupees Only';
}

export function formatCurrency(amount, withSymbol = true) {
    const symbol = withSymbol ? '₹' : 'Rs. ';
    return symbol + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

export function downloadBillPDF(txn, profile, type = 'Sale Invoice') {
    try {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const W = 210, H = 297, ml = 15, mr = 195;

        // Colors extracted from design
        const textBrown = [92, 78, 67];      
        const textLight = [135, 125, 116];   

        // Add the actual template background uploaded by user
        doc.addImage(`data:${templateMime};base64,${templateBase64}`, 'JPEG', 0, 0, W, H);

        // Document Structure (Dynamic Overlay Data)
        doc.setFont('helvetica', 'normal');
        
        // Invoice Number (placed near "NO:")
        doc.setFontSize(10);
        doc.setTextColor(textBrown[0], textBrown[1], textBrown[2]);
        doc.text(txn.invoiceNo || 'Draft', 190, 55.5, { align: 'right' });

        // Date (placed near "Date:")
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        doc.text(formatDate(txn.date), 29, 70);

        // Billed to Customer Name
        doc.text([
            txn.customerName || 'Cash Customer',
            txn.customerPhone ? 'Ph: ' + txn.customerPhone : '',
        ], ml, 92);

        // Items table (starts under printed header at Y=110)
        let rowY = 130;

        const items = txn.items || [];
        
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        
        items.forEach((item) => {
            const qtyStr = (item.quantity || item.qty || 0).toString();
            // User noted total calculation mismatch due to undefined price mappings
            const finalPrice = Number(item.price || item.price_per_unit || item.rate || 0);
            const finalAmount = Number(item.amount || (finalPrice * Number(qtyStr)) || 0);
            
            doc.text((item.name || item.item_name || 'Item').substring(0, 40), ml + 2, rowY);
            doc.text(qtyStr, W/2 + 3, rowY, { align: 'center' });
            doc.text(formatCurrency(finalPrice, false), W/2 + 45, rowY, { align: 'right' });
            doc.text(formatCurrency(finalAmount, false), mr - 2, rowY, { align: 'right' });
            rowY += 8;
        });

        // Total calculated value
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textBrown[0], textBrown[1], textBrown[2]);
        const finalTotal = Number(txn.total_amount || txn.total || 0);
        doc.text('Rs. ' + formatCurrency(finalTotal, false), mr - 2, 177, { align: 'right' });
        
        // Payment Mode
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(textLight[0], textLight[1], textLight[2]);
        doc.text((txn.paymentMode || txn.payment_mode || 'Cash'), 47, 192);

        // Download
        const filename = `${type.replace(/\s+/g, '_')}_${txn.invoiceNo || 'Draft'}.pdf`;
        doc.save(filename);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('Could not generate PDF. Please check the console for errors.');
    }
}
