import PDFDocument from 'pdfkit';

/**
 * Renders an official AlphaMinds Certificate PDF buffer from snapshot data.
 * @param {Object} data Certificate snapshot parameters
 * @param {string} data.student_name Name of student
 * @param {string} data.course_title Title of course
 * @param {string} data.instructor_name Name of teacher or "AlphaMinds Academic Team"
 * @param {string} data.certificate_code Unique certificate code (e.g. CERT-2026-8F92A1)
 * @param {string} data.issued_at Issue date formatted string or ISO
 * @returns {Promise<Buffer>} PDF Buffer
 */
export function generateCertificatePdfBuffer(data) {
  return new Promise((resolve, reject) => {
    try {
      // Create A4 Landscape PDF Document (841.89 x 595.28 pt)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const width = doc.page.width;   // 841.89
      const height = doc.page.height; // 595.28

      // Colors
      const navy = '#0F2B5C';
      const gold = '#D4AF37';
      const textGray = '#475569';
      const lightBg = '#F8FAFC';

      // ──────────────────────────────────────────
      // 1. BORDERS & CORNER ACCENTS
      // ──────────────────────────────────────────
      // Outer Navy Border
      doc.rect(18, 18, width - 36, height - 36).lineWidth(3).stroke(navy);

      // Inner Gold Border
      doc.rect(25, 25, width - 50, height - 50).lineWidth(1).stroke(gold);

      // Corner Accents
      const accentSize = 25;
      // Top-Left Corner
      doc.moveTo(30, 30 + accentSize).lineTo(30, 30).lineTo(30 + accentSize, 30).lineWidth(2.5).stroke(gold);
      // Top-Right Corner
      doc.moveTo(width - 30 - accentSize, 30).lineTo(width - 30, 30).lineTo(width - 30, 30 + accentSize).lineWidth(2.5).stroke(gold);
      // Bottom-Left Corner
      doc.moveTo(30, height - 30 - accentSize).lineTo(30, height - 30).lineTo(30 + accentSize, height - 30).lineWidth(2.5).stroke(gold);
      // Bottom-Right Corner
      doc.moveTo(width - 30 - accentSize, height - 30).lineTo(width - 30, height - 30).lineTo(width - 30, height - 30 - accentSize).lineWidth(2.5).stroke(gold);

      // ──────────────────────────────────────────
      // 2. HEADER: BRAND & CERTIFICATE ID
      // ──────────────────────────────────────────
      // Brand Logo & Title (Top-Left)
      doc.roundedRect(45, 42, 34, 34, 6).fillAndStroke(navy, gold);
      doc.font('Helvetica-Bold').fontSize(18).fillColor(gold).text('A', 45, 50, { width: 34, align: 'center' });

      doc.font('Helvetica-Bold').fontSize(16).fillColor(navy).text('ALPHAMINDS', 88, 51);

      // Certificate ID Tag (Top-Right)
      const certIdText = `ID: ${data.certificate_code}`;
      doc.roundedRect(width - 230, 45, 185, 26, 13).fillAndStroke(lightBg, '#CBD5E1');
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#475569').text(certIdText, width - 230, 53, { width: 185, align: 'center' });

      // ──────────────────────────────────────────
      // 3. BODY CONTENT
      // ──────────────────────────────────────────
      // Certificate Title
      doc.font('Helvetica-Bold').fontSize(26).fillColor(navy).text('CERTIFICATE OF COMPLETION', 0, 115, { width: width, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(gold).text('OFFICIAL ACADEMIC ACHIEVEMENT', 0, 150, { width: width, align: 'center' });

      // Attestation Text
      doc.font('Helvetica-Oblique').fontSize(12).fillColor('#64748B').text('This is to certify that', 0, 182, { width: width, align: 'center' });

      // Student Name
      const studentNameStr = data.student_name ? data.student_name.toUpperCase() : 'STUDENT NAME';
      doc.font('Helvetica-BoldOblique').fontSize(32).fillColor(navy).text(studentNameStr, 0, 208, { width: width, align: 'center' });

      // Underline under Student Name
      const nameWidth = Math.min(doc.widthOfString(studentNameStr) + 40, width - 160);
      const nameX = (width - nameWidth) / 2;
      doc.moveTo(nameX, 248).lineTo(nameX + nameWidth, 248).lineWidth(2).stroke(gold);

      // Description Text
      doc.font('Helvetica').fontSize(12).fillColor(textGray).text(
        'has successfully completed all required lectures, coursework, and assessment standards for the course',
        80, 266, { width: width - 160, align: 'center' }
      );

      // Course Title
      const courseTitleStr = data.course_title ? data.course_title.toUpperCase() : 'COURSE TITLE';
      doc.font('Helvetica-Bold').fontSize(18).fillColor(navy).text(courseTitleStr, 60, 310, { width: width - 120, align: 'center' });

      // Instructor Line
      const instructorStr = `Instructed by: ${data.instructor_name || 'AlphaMinds Academic Team'}`;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#475569').text(instructorStr, 0, 342, { width: width, align: 'center' });

      // ──────────────────────────────────────────
      // 4. FOOTER: ISSUE DATE & GOLD MEDAL SEAL
      // ──────────────────────────────────────────
      const formatDateStr = (isoDate) => {
        try {
          const d = new Date(isoDate);
          return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch (e) {
          return isoDate || 'July 28, 2026';
        }
      };

      const formattedDate = formatDateStr(data.issued_at);

      // Left Issue Info Block
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748B').text('DATE OF ISSUANCE', 55, 475);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(navy).text(formattedDate, 55, 488);

      doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748B').text('ISSUED BY', 55, 510);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(navy).text('AlphaMinds Platform', 55, 523);

      // Right Gold Medal Seal
      const sealX = width - 125;
      const sealY = height - 125;

      doc.circle(sealX, sealY, 32).fillAndStroke(gold, '#B45309');
      doc.circle(sealX, sealY, 26).lineWidth(1.5).dash(3, { space: 2 }).stroke('#FFFFFF');
      doc.undash();

      doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF').text('OFFICIAL\nALPHAMINDS', sealX - 26, sealY - 10, { width: 52, align: 'center' });

      // Finalize document
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
