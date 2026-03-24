// =============================================
// Reports Module - Professional PDF Formatting
// =============================================

const Reports = {
    // ── HELPER: CROPS SQUARE LOGO INTO A CIRCLE ──
    async getCircularLogo() {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = 'logo.jpg'; // Path to your file
            img.crossOrigin = "Anonymous"; // Prevents security errors
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Create a square canvas based on the smallest dimension
                const size = Math.min(img.width, img.height);
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                // 1. Create a circular mask
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                // 2. Center and draw the image inside the circle
                ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
                
                // Return as PNG (supports transparency)
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => {
                console.warn("Logo not found. Exporting without logo.");
                resolve(null);
            };
        });
    },

    // ── SHARED HEADER AND SIGNATURE LOGIC ──
    async drawTemplate(doc, title, period) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const managerName = (localStorage.getItem('userName') || "JANE DIMAANO").toUpperCase();

        // 1. Dark Green Header (Matches DepEd Green)
        doc.setFillColor(15, 61, 15);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // 2. Add Logo (Cropped Circular PNG)
        const logoData = await this.getCircularLogo();
        if (logoData) {
            // x: 15, y: 7, size: 30x30
            doc.addImage(logoData, 'PNG', 15, 7, 30, 30);
        }

        // 3. Header Text (White, Centered)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("SAN IGNACIO ELEMENTARY SCHOOL", 120, 22, { align: "center" });
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.text("Canteen Management System", 120, 32, { align: "center" });

        // 4. Report Title (Black)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text(title, pageWidth / 2, 60, { align: "center" });
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text(`Period: ${period}`, pageWidth / 2, 70, { align: "center" });

        // 5. Bottom Signatures
        const sigY = pageHeight - 35;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);

        // Manager Side
        doc.line(15, sigY, 80, sigY);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(managerName, 47.5, sigY - 2, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("Canteen Manager", 47.5, sigY + 5, { align: "center" });

        // Principal Side
        doc.line(pageWidth - 80, sigY, pageWidth - 15, sigY);
        doc.setFont("helvetica", "bold");
        doc.text("Principal", pageWidth - 47.5, sigY + 5, { align: "center" });
    },

    // ── 1. EXPORT PURCHASE HISTORY ──
    async exportShoppingHistoryPDF(records, fromDate, toDate) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const periodLabel = (fromDate === toDate) ? fromDate : `${fromDate} to ${toDate}`;

        await this.drawTemplate(doc, "Purchase History Report", periodLabel);

        const tableBody = records.map(r => [
            r.date, 
            r.name, 
            r.qty, 
            r.unit || 'pcs', 
            parseFloat(r.cost).toFixed(2)
        ]);

        doc.autoTable({
            startY: 80,
            head: [['Date', 'Item Purchased', 'Qty', 'Unit', 'Cost (PhP)']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 61, 15], textColor: 255, halign: 'center' },
            columnStyles: {
                0: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'right' }
            },
            styles: { fontSize: 11, cellPadding: 5 }
        });

        // Period Summary Box
        const totalSpent = records.reduce((sum, r) => sum + parseFloat(r.cost), 0);
        let finalY = doc.lastAutoTable.finalY + 15;
        
        doc.setFillColor(15, 61, 15);
        doc.rect(15, finalY, 180, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text("PERIOD SUMMARY", 105, finalY + 8, { align: "center" });
        doc.setFontSize(13);
        doc.text(`Total Amount Spent: ${totalSpent.toFixed(2)}`, 105, finalY + 16, { align: "center" });

        doc.save(`Purchase_Report_${fromDate}.pdf`);
    },

    // ── 2. EXPORT DAILY LEDGER ──
    async exportLedgerPDF(r) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        await this.drawTemplate(doc, "Daily Production Ledger", r.date);

        const tableBody = r.products.map(p => [
            p.name, 
            p.quantity, 
            parseFloat(p.cost).toFixed(2), 
            parseFloat(p.price).toFixed(2),
            (p.quantity * p.price).toFixed(2)
        ]);

        doc.autoTable({
            startY: 80,
            head: [['Product Name', 'Qty Sold', 'Material Exp.', 'Price /ea', 'Total Sales']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 61, 15], textColor: 255, halign: 'center' },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right' }
            },
            styles: { fontSize: 10, cellPadding: 4 }
        });

        // Summary Box
        let finalY = doc.lastAutoTable.finalY + 15;
        doc.setFillColor(15, 61, 15);
        doc.rect(15, finalY, 180, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text("DAILY SUMMARY", 105, finalY + 8, { align: "center" });
        doc.setFontSize(13);
        doc.text(`Net Profit: ${parseFloat(r.netProfit).toFixed(2)}`, 105, finalY + 16, { align: "center" });

        doc.save(`Daily_Ledger_${r.date}.pdf`);
    },

    // ── 3. EXPORT DAILY LEDGER DATE RANGE ──
    async exportLedgerDateRangePDF(records, fromDate, toDate) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const periodLabel = `${fromDate} to ${toDate}`;

        await this.drawTemplate(doc, "Daily Production Ledger", periodLabel);

        const tableBody = records.map(r => [
            r.date,
            r.totalSales ? parseFloat(r.totalSales).toFixed(2) : '0.00',
            r.totalCost ? parseFloat(r.totalCost).toFixed(2) : '0.00',
            r.netProfit ? parseFloat(r.netProfit).toFixed(2) : '0.00'
        ]);

        doc.autoTable({
            startY: 80,
            head: [['Date', 'Gross Sales (PhP)', 'Total Expenses (PhP)', 'Net Profit (PhP)']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 61, 15], textColor: 255, halign: 'center' },
            columnStyles: {
                0: { halign: 'center' },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' }
            },
            styles: { fontSize: 11, cellPadding: 5 }
        });

        // Period Summary Box
        let totalSales = 0, totalExpenses = 0;
        records.forEach(r => {
            totalSales += parseFloat(r.totalSales) || 0;
            totalExpenses += parseFloat(r.totalCost) || 0;
        });
        
        let finalY = doc.lastAutoTable.finalY + 15;
        doc.setFillColor(15, 61, 15);
        doc.rect(15, finalY, 180, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text("PERIOD SUMMARY", 105, finalY + 8, { align: "center" });
        doc.setFontSize(13);
        doc.text(`Total Sales: ${totalSales.toFixed(2)} | Profit: ${(totalSales - totalExpenses).toFixed(2)}`, 105, finalY + 16, { align: "center" });

        doc.save(`Daily_Ledger_${fromDate}_to_${toDate}.pdf`);
    },

    // ── 4. EXPORT SHOPPING TRIP ──
    async exportTripPDF(tripItems, date) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        await this.drawTemplate(doc, "Weekly Shopping Trip Record", date);

        const tableBody = tripItems.map(item => [
            item.name,
            parseFloat(item.qty).toFixed(2),
            item.unit || 'pcs',
            parseFloat(item.cost).toFixed(2)
        ]);

        doc.autoTable({
            startY: 80,
            head: [['Item Name', 'Qty', 'Unit', 'Cost (PhP)']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 61, 15], textColor: 255, halign: 'center' },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'right' }
            },
            styles: { fontSize: 11, cellPadding: 5 }
        });

        // Trip Summary Box
        const totalCost = tripItems.reduce((sum, item) => sum + parseFloat(item.cost), 0);
        let finalY = doc.lastAutoTable.finalY + 15;
        
        doc.setFillColor(15, 61, 15);
        doc.rect(15, finalY, 180, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.text("TRIP TOTAL", 105, finalY + 8, { align: "center" });
        doc.setFontSize(13);
        doc.text(`Total Amount Spent: ${totalCost.toFixed(2)}`, 105, finalY + 16, { align: "center" });

        doc.save(`Shopping_Trip_${date}.pdf`);
    }
};