import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CandidateDetail } from '../types';

// Samsung brand colors
const SAMSUNG_BLUE = [20, 40, 160] as const;
const LIGHT_BLUE = [230, 237, 255] as const;
const LIGHT_GRAY = [245, 245, 248] as const;
const WHITE = [255, 255, 255] as const;
const TEXT_PRIMARY = [30, 30, 40] as const;
const TEXT_SECONDARY = [100, 105, 120] as const;
const SUCCESS_GREEN = [22, 163, 74] as const;
const DANGER_RED = [220, 38, 38] as const;
const WARNING_AMBER = [217, 119, 6] as const;
const BORDER_COLOR = [210, 215, 225] as const;
const STAR_FILLED = [245, 180, 0] as const;
const STAR_EMPTY = [200, 205, 215] as const;

type RGB = readonly [number, number, number];

// ──── Draw filled/empty star circles instead of Unicode ────
function drawStars(doc: jsPDF, rating: number, x: number, y: number, size = 2) {
    const gap = size * 2.4;
    for (let i = 0; i < 5; i++) {
        const cx = x + i * gap + size;
        if (i < Math.round(rating)) {
            doc.setFillColor(...STAR_FILLED);
            doc.circle(cx, y, size, 'F');
        } else {
            doc.setFillColor(...STAR_EMPTY);
            doc.circle(cx, y, size, 'F');
        }
    }
}

// Draw star dots inside a table cell (used via didDrawCell)
function drawStarsInCell(doc: jsPDF, rating: number, cell: { x: number; y: number; width: number; height: number }) {
    const dotR = 1.6;
    const gap = dotR * 2.6;
    const totalW = 5 * gap - (gap - dotR * 2);
    const startX = cell.x + (cell.width - totalW) / 2 + dotR;
    const cy = cell.y + cell.height / 2;
    for (let i = 0; i < 5; i++) {
        const cx = startX + i * gap;
        if (i < Math.round(rating)) {
            doc.setFillColor(...STAR_FILLED);
            doc.circle(cx, cy, dotR, 'F');
        } else {
            doc.setFillColor(...STAR_EMPTY);
            doc.circle(cx, cy, dotR, 'F');
        }
    }
}

function drawSamsungLogo(doc: jsPDF, x: number, y: number, width: number) {
    const height = width * 0.28;
    doc.setFillColor(...SAMSUNG_BLUE);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(width * 0.32);
    doc.setTextColor(...WHITE);
    doc.text('SAMSUNG', x + width / 2, y + height * 0.68, { align: 'center' });
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

function statusLabel(status: string): string {
    const map: Record<string, string> = {
        New: 'New', InProgress: 'In Progress', Recruited: 'Recruited',
        Rejected: 'Rejected', Passed: 'Passed', Failed: 'Failed', Pending: 'Pending'
    };
    return map[status] || status;
}

function statusColor(status: string): RGB {
    switch (status) {
        case 'Passed': case 'Recruited': return SUCCESS_GREEN;
        case 'Failed': case 'Rejected': return DANGER_RED;
        case 'InProgress': case 'Pending': return WARNING_AMBER;
        default: return SAMSUNG_BLUE;
    }
}

export function generateCandidatePdf(candidate: CandidateDetail) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();  // 210
    const pageH = doc.internal.pageSize.getHeight();  // 297
    const margin = 18;
    const contentW = pageW - margin * 2;  // 174
    let y = 0;

    // ──────────── Helper: Check for page break ────────────
    const checkPageBreak = (needed: number) => {
        if (y + needed > pageH - 22) {
            doc.addPage();
            y = 18;
        }
    };

    // ──────────── Helper: Section title ────────────
    const sectionTitle = (title: string) => {
        checkPageBreak(18);
        y += 6;
        doc.setFillColor(...SAMSUNG_BLUE);
        doc.roundedRect(margin, y, contentW, 9, 1.5, 1.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...WHITE);
        doc.text(title.toUpperCase(), margin + 5, y + 6.2);
        y += 13;
    };

    // ──────────── Helper: Key-value row ────────────
    const kvRow = (key: string, value: string, xOffset = margin, width = contentW) => {
        checkPageBreak(8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT_SECONDARY);
        doc.text(key, xOffset + 4, y + 4);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXT_PRIMARY);
        const maxTextW = width - 10;
        const lines = doc.splitTextToSize(value || '--', maxTextW);
        doc.text(lines, xOffset + 4, y + 9);
        y += 7 + lines.length * 4;
    };

    // ════════════════════════════════════════════════════════
    // HEADER
    // ════════════════════════════════════════════════════════
    doc.setFillColor(15, 30, 130);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setFillColor(...SAMSUNG_BLUE);
    doc.rect(0, 22, pageW, 20, 'F');

    // Samsung logo
    drawSamsungLogo(doc, margin, 6, 46);

    // Report title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text('Candidate Evaluation Report', pageW - margin, 14, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 210, 255);
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, pageW - margin, 19, { align: 'right' });

    // Candidate name band
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...WHITE);
    const nameText = doc.splitTextToSize(candidate.fullName, contentW - 50);
    doc.text(nameText[0], margin + 2, 34);

    const statusText = statusLabel(candidate.status);
    const stColor = statusColor(candidate.status);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(...stColor);
    const stWidth = doc.getTextWidth(statusText) + 8;
    doc.roundedRect(pageW - margin - stWidth, 29.5, stWidth, 7, 2, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.text(statusText, pageW - margin - stWidth + 4, 34);

    y = 48;

    // ════════════════════════════════════════════════════════
    // CANDIDATE OVERVIEW CARD
    // ════════════════════════════════════════════════════════
    sectionTitle('Candidate Overview');

    const colW = (contentW - 4) / 2;
    const leftX = margin;
    const rightX = margin + colW + 4;

    // Background card
    const cardH = 52;
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(margin, y - 1, contentW, cardH, 2, 2, 'F');
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y - 1, contentW, cardH, 2, 2, 'S');

    const savedY = y;
    kvRow('Position Applied', candidate.jobTitle || '--', leftX, colW);
    kvRow('Job ID', candidate.jobId || '--', leftX, colW);
    kvRow('Email', candidate.email, leftX, colW);
    kvRow('Phone', candidate.phone || '--', leftX, colW);

    y = savedY;
    kvRow('Department', candidate.department || '--', rightX, colW);
    kvRow('Hiring Manager', candidate.managerName || '--', rightX, colW);
    kvRow('Experience', candidate.experienceYears ? `${candidate.experienceYears} years` : '--', rightX, colW);
    kvRow('Current Company', candidate.currentCompany || '--', rightX, colW);

    y = savedY + cardH + 3;

    // Skills & AlphaCoder row
    if (candidate.skills || candidate.alphaCoderScore) {
        const skillBoxH = 14;
        doc.setFillColor(...LIGHT_GRAY);
        doc.roundedRect(margin, y, contentW, skillBoxH, 2, 2, 'F');
        doc.setDrawColor(...BORDER_COLOR);
        doc.roundedRect(margin, y, contentW, skillBoxH, 2, 2, 'S');

        if (candidate.skills) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...TEXT_SECONDARY);
            doc.text('Skills', margin + 4, y + 5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...TEXT_PRIMARY);
            const skillLines = doc.splitTextToSize(candidate.skills, contentW - 60);
            doc.text(skillLines[0], margin + 4, y + 10);
        }

        if (candidate.alphaCoderScore != null) {
            const acColor = candidate.alphaCoderScore >= 70 ? SUCCESS_GREEN :
                           candidate.alphaCoderScore >= 50 ? WARNING_AMBER : DANGER_RED;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...TEXT_SECONDARY);
            doc.text('AlphaCoder Score', pageW - margin - 38, y + 5);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(...acColor);
            doc.text(`${candidate.alphaCoderScore}%`, pageW - margin - 38, y + 11);
        }
        y += skillBoxH + 4;
    }

    // Notes
    if (candidate.notes) {
        y += 1;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT_SECONDARY);
        doc.text('Notes:', margin + 2, y + 3);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT_PRIMARY);
        const noteLines = doc.splitTextToSize(candidate.notes, contentW - 10);
        doc.text(noteLines, margin + 2, y + 8);
        y += 10 + noteLines.length * 3.5;
    }

    // ════════════════════════════════════════════════════════
    // INTERVIEW PROGRESS SUMMARY
    // ════════════════════════════════════════════════════════
    sectionTitle('Interview Progress');

    const completedInterviews = candidate.interviews.filter(i => i.status !== 'Pending');
    const progressPct = candidate.totalSteps > 0
        ? Math.round((candidate.currentStepNumber / candidate.totalSteps) * 100)
        : 0;

    // Progress bar card
    checkPageBreak(18);
    doc.setFillColor(...LIGHT_GRAY);
    doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F');
    doc.setDrawColor(...BORDER_COLOR);
    doc.roundedRect(margin, y, contentW, 16, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_PRIMARY);
    doc.text(`Step ${candidate.currentStepNumber} of ${candidate.totalSteps}`, margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text(`${progressPct}% Complete`, pageW - margin - 4, y + 6, { align: 'right' });

    // Draw progress bar
    const barX = margin + 4;
    const barW = contentW - 8;
    const barY = y + 9;
    doc.setFillColor(220, 225, 235);
    doc.roundedRect(barX, barY, barW, 4, 2, 2, 'F');
    if (progressPct > 0) {
        const fillColor = candidate.status === 'Rejected' ? DANGER_RED :
                         candidate.status === 'Recruited' ? SUCCESS_GREEN : SAMSUNG_BLUE;
        doc.setFillColor(...fillColor);
        doc.roundedRect(barX, barY, Math.max(barW * progressPct / 100, 4), 4, 2, 2, 'F');
    }
    y += 20;

    // Interview summary table
    if (candidate.interviews.length > 0) {
        checkPageBreak(12 + candidate.interviews.length * 8);

        const tableMargin = margin + 1;
        const tableContentW = contentW - 2;

        // Build rating lookup for this table
        const summaryRatings: Record<number, number> = {};
        candidate.interviews.forEach((iv, i) => {
            if (iv.overallRating) summaryRatings[i] = iv.overallRating;
        });

        autoTable(doc, {
            startY: y,
            margin: { left: tableMargin, right: tableMargin },
            tableWidth: tableContentW,
            head: [['#', 'Round Name', 'Status', 'Interviewer', 'Date', 'Rating']],
            body: candidate.interviews.map(iv => [
                `${iv.stepNumber}`,
                iv.stepName,
                statusLabel(iv.status),
                iv.interviewerName || '--',
                iv.interviewDate ? formatDate(iv.interviewDate) : '--',
                iv.overallRating ? `${iv.overallRating}/5` : '--'
            ]),
            theme: 'grid',
            headStyles: {
                fillColor: SAMSUNG_BLUE as unknown as number[],
                textColor: WHITE as unknown as number[],
                fontStyle: 'bold',
                fontSize: 7.5,
                cellPadding: 2.5,
            },
            bodyStyles: {
                fontSize: 7.5,
                cellPadding: 2,
                textColor: TEXT_PRIMARY as unknown as number[],
            },
            alternateRowStyles: {
                fillColor: LIGHT_GRAY as unknown as number[],
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 22, halign: 'center' },
                3: { cellWidth: 32 },
                4: { cellWidth: 28 },
                5: { cellWidth: 24, halign: 'center' },
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 2) {
                    const val = data.cell.raw as string;
                    if (val === 'Passed') data.cell.styles.textColor = SUCCESS_GREEN as unknown as number[];
                    else if (val === 'Failed') data.cell.styles.textColor = DANGER_RED as unknown as number[];
                    else if (val === 'Pending') data.cell.styles.textColor = WARNING_AMBER as unknown as number[];
                }
                // Clear the rating text — we draw dots instead
                if (data.section === 'body' && data.column.index === 5 && summaryRatings[data.row.index] != null) {
                    data.cell.text = [''];
                }
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 5) {
                    const rating = summaryRatings[data.row.index];
                    if (rating != null) {
                        drawStarsInCell(doc, rating, data.cell);
                    }
                }
            },
        });

        y = (doc as any).lastAutoTable.finalY + 6;
    }

    // ════════════════════════════════════════════════════════
    // DETAILED EVALUATION FEEDBACK PER ROUND
    // ════════════════════════════════════════════════════════
    if (completedInterviews.length > 0) {
        sectionTitle('Detailed Evaluation Feedback');

        completedInterviews.forEach((iv, idx) => {
            checkPageBreak(30);

            // Round header card
            const roundColor = iv.status === 'Passed' ? SUCCESS_GREEN : DANGER_RED;
            doc.setFillColor(...LIGHT_BLUE);
            doc.roundedRect(margin, y, contentW, 11, 2, 2, 'F');
            doc.setDrawColor(...SAMSUNG_BLUE);
            doc.setLineWidth(0.4);
            doc.roundedRect(margin, y, contentW, 11, 2, 2, 'S');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(...SAMSUNG_BLUE);
            const roundTitle = `Round ${iv.stepNumber}: ${iv.stepName}`;
            const maxRoundTitleW = contentW - 40;
            const truncatedTitle = doc.splitTextToSize(roundTitle, maxRoundTitleW)[0];
            doc.text(truncatedTitle, margin + 4, y + 7);

            // Status pill
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setFillColor(...roundColor);
            const roundStatusText = statusLabel(iv.status);
            const rsW = doc.getTextWidth(roundStatusText) + 7;
            doc.roundedRect(pageW - margin - rsW - 2, y + 2, rsW, 7, 2, 2, 'F');
            doc.setTextColor(...WHITE);
            doc.text(roundStatusText, pageW - margin - rsW - 2 + 3.5, y + 6.8);

            y += 14;

            // Round meta info
            const metaItems: string[] = [];
            if (iv.interviewerName) metaItems.push(`Interviewer: ${iv.interviewerName}`);
            if (iv.interviewDate) metaItems.push(`Date: ${formatDate(iv.interviewDate)}`);
            if (iv.overallRating) metaItems.push(`Overall: ${iv.overallRating}/5`);
            if (iv.conductedByName) metaItems.push(`By: ${iv.conductedByName}`);

            if (metaItems.length > 0) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(...TEXT_SECONDARY);
                // Split meta into safe chunks
                const metaText = metaItems.join('  |  ');
                const metaLines = doc.splitTextToSize(metaText, contentW - 8);
                doc.text(metaLines, margin + 4, y + 3);
                y += 3 + metaLines.length * 3.5;

                // Draw overall rating stars visually
                if (iv.overallRating) {
                    drawStars(doc, iv.overallRating, margin + 4, y + 1, 1.8);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(...TEXT_PRIMARY);
                    doc.text(`${iv.overallRating}/5`, margin + 28, y + 2.5);
                    y += 6;
                }
            }

            // Evaluation criteria table
            if (iv.evaluations.length > 0) {
                const grouped: Record<string, typeof iv.evaluations> = {};
                iv.evaluations.forEach(e => {
                    (grouped[e.category] = grouped[e.category] || []).push(e);
                });

                const tableBody: string[][] = [];
                Object.entries(grouped).forEach(([category, evals]) => {
                    tableBody.push({ cells: [category.toUpperCase(), '', '', ''], _isCategoryRow: true } as any);
                    evals.forEach(e => {
                        tableBody.push({ cells: [`  ${e.questionText}`, '', `${e.rating}/5`, e.remarks || '--'], _rating: e.rating } as any);
                    });
                });

                const evalTableMargin = margin + 2;

                // Build proper body array from our tagged objects
                const bodyRows = tableBody.map((row: any) => row.cells || row);
                const ratingMap: Record<number, number> = {};
                let rowIdx = 0;
                const categoryRows = new Set<number>();
                tableBody.forEach((row: any) => {
                    if (row._isCategoryRow) categoryRows.add(rowIdx);
                    if (row._rating != null) ratingMap[rowIdx] = row._rating;
                    rowIdx++;
                });

                autoTable(doc, {
                    startY: y,
                    margin: { left: evalTableMargin, right: evalTableMargin },
                    tableWidth: contentW - 4,
                    head: [['Criteria', 'Rating', 'Score', 'Remarks']],
                    body: bodyRows,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [50, 65, 140] as number[],
                        textColor: WHITE as unknown as number[],
                        fontStyle: 'bold',
                        fontSize: 7,
                        cellPadding: 2,
                    },
                    bodyStyles: {
                        fontSize: 7,
                        cellPadding: 1.8,
                        textColor: TEXT_PRIMARY as unknown as number[],
                        overflow: 'linebreak',
                    },
                    alternateRowStyles: {
                        fillColor: [248, 249, 252] as number[],
                    },
                    columnStyles: {
                        0: { cellWidth: 60 },
                        1: { cellWidth: 26, halign: 'center' },
                        2: { cellWidth: 14, halign: 'center' },
                        3: { cellWidth: 'auto', overflow: 'linebreak' },
                    },
                    didParseCell: (data) => {
                        if (data.section === 'body') {
                            if (categoryRows.has(data.row.index)) {
                                data.cell.styles.fontStyle = 'bold';
                                data.cell.styles.fillColor = LIGHT_BLUE as unknown as number[];
                                data.cell.styles.textColor = SAMSUNG_BLUE as unknown as number[];
                                data.cell.styles.fontSize = 7.5;
                            }
                        }
                    },
                    didDrawCell: (data) => {
                        // Draw star dots in the Rating column (index 1) for non-category rows
                        if (data.section === 'body' && data.column.index === 1) {
                            const rating = ratingMap[data.row.index];
                            if (rating != null) {
                                drawStarsInCell(doc, rating, data.cell);
                            }
                        }
                    },
                });

                y = (doc as any).lastAutoTable.finalY + 4;
            }

            // Comments
            if (iv.comments) {
                checkPageBreak(16);
                doc.setFillColor(252, 252, 255);
                doc.setDrawColor(...BORDER_COLOR);
                doc.setLineWidth(0.3);
                const commentLines = doc.splitTextToSize(iv.comments, contentW - 16);
                const commentH = 8 + commentLines.length * 3.5;
                doc.roundedRect(margin + 2, y, contentW - 4, commentH, 1.5, 1.5, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(...TEXT_SECONDARY);
                doc.text('Comments:', margin + 6, y + 5);
                doc.setFont('helvetica', 'italic');
                doc.setFontSize(7.5);
                doc.setTextColor(...TEXT_PRIMARY);
                doc.text(commentLines, margin + 6, y + 10);
                y += commentH + 4;
            }

            // Divider between rounds
            if (idx < completedInterviews.length - 1) {
                checkPageBreak(8);
                doc.setDrawColor(...BORDER_COLOR);
                doc.setLineWidth(0.2);
                doc.setLineDashPattern([2, 2], 0);
                doc.line(margin + 10, y + 2, pageW - margin - 10, y + 2);
                doc.setLineDashPattern([], 0);
                y += 6;
            }
        });
    }

    // ════════════════════════════════════════════════════════
    // FOOTER ON ALL PAGES
    // ════════════════════════════════════════════════════════
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(...TEXT_SECONDARY);
        doc.text(
            `Samsung RMS  |  Candidate Evaluation Report  |  Page ${i} of ${totalPages}`,
            pageW / 2, pageH - 8,
            { align: 'center' }
        );
        doc.setDrawColor(...BORDER_COLOR);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12);

        // Confidential watermark
        doc.setFontSize(5.5);
        doc.setTextColor(200, 205, 220);
        doc.text('CONFIDENTIAL - Samsung Electronics', pageW - margin, pageH - 5, { align: 'right' });
    }

    // Save
    const safeName = candidate.fullName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Samsung_RMS_${safeName}_Report.pdf`);
}
