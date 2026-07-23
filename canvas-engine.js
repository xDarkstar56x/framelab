export function renderFrame(canvas, image, appState) {
    const ctx = canvas.getContext('2d');
    const longestSide = Math.max(image.width, image.height);
    
    // 1. Cálculos de Márgenes
    const userMt = appState.borderTop / 100;
    const userMb = appState.borderBottom / 100;
    
    const mt = longestSide * userMt;
    const mb = longestSide * userMb;
    const ml = longestSide * userMt;
    const mr = longestSide * userMt;

    canvas.width = image.width + ml + mr;
    canvas.height = image.height + mt + mb;

    // 2. Fondo y Sombra
    ctx.fillStyle = appState.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (appState.shadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = longestSide * 0.015;
        ctx.shadowOffsetY = longestSide * 0.01;
        ctx.shadowOffsetX = 0;
    }
    ctx.drawImage(image, ml, mt, image.width, image.height);
    ctx.restore();

    // 3. Preparación Tipográfica
    const customFont = appState.fontFamily;
    const customStyle = appState.fontStyle ? `${appState.fontStyle} ` : '';
    const sizeMain = canvas.width * (appState.fontSizeMain / 1000);
    const sizeExif = canvas.width * (appState.fontSizeExif / 1000);
    const lineSpacing = longestSide * 0.008; 
    
    const centerText = appState.author || "";
    const leftArr = [appState.camera, appState.lens].filter(v => v && v.trim() !== "");
    const photoParams = [appState.focal, appState.aperture, appState.shutter, appState.iso].filter(v => v && v.trim() !== "");
    
    const leftText = leftArr.join("  •  ");
    const rightText = [...photoParams, appState.date, appState.gps].filter(v => v && v.trim() !== "").join("      •      ");

    let alignType = appState.textAlignment;

    // 4. LÓGICA RESPONSIVA
    if (alignType === 'split') {
        ctx.font = `${customStyle}${sizeExif}px ${customFont}`;
        const wLeft = ctx.measureText(leftText).width;
        const wRight = ctx.measureText(rightText).width;
        
        ctx.font = `${customStyle}${sizeMain}px ${customFont}`;
        const wCenter = ctx.measureText(centerText).width;

        const availableSpace = canvas.width - ml - mr;
        const safeZone = (availableSpace / 2) - (wCenter / 2) - (canvas.width * 0.02);

        if (wLeft > safeZone || wRight > safeZone || (wLeft + wRight > availableSpace - (canvas.width * 0.05))) {
            alignType = 'modern_center';
        }
    }

    // 5. PREPARACIÓN DE BLOQUES DE TEXTO
    const textLines = [];
    if (alignType === 'modern_left' || alignType === 'modern_center') {
        if (centerText) textLines.push({ text: centerText, size: sizeMain, isTitle: true });
        if (appState.camera) textLines.push({ text: appState.camera, size: sizeExif, isTitle: false });
        if (appState.lens) textLines.push({ text: appState.lens, size: sizeExif, isTitle: false });
        if (photoParams.length > 0) textLines.push({ text: photoParams.join("  •  "), size: sizeExif, isTitle: false });
        
        // Separamos Fecha y GPS para un estilo limpio con espacio extra
        const extraParams = [appState.date, appState.gps].filter(v => v && v.trim() !== "");
        if (extraParams.length > 0) textLines.push({ text: extraParams.join("       •       "), size: sizeExif, isTitle: false });
        
        // Condicional de los pixeles
        if (appState.showRes) textLines.push({ text: `${image.width}×${image.height}`, size: sizeExif, isTitle: false });
    }

    const hasPalette = appState.palette && appState.palette.length > 0;
    const pSize = canvas.width * 0.022; // Aumentamos tamaño de Pincelada en el render
    const pGap = canvas.width * 0.015;
    const pTotalW = hasPalette ? (pSize * appState.palette.length) + (pGap * (appState.palette.length - 1)) : 0;
    const spaceBetweenTextAndPalette = longestSide * 0.02;

    ctx.fillStyle = appState.textColor;
    const bottomCenterY = mt + image.height + (mb / 2);

    // 6. RENDERIZADO FINAL
    if (alignType === 'modern_center') {
        ctx.textBaseline = 'top';
        const textH = textLines.reduce((acc, l) => acc + l.size + lineSpacing, 0) - lineSpacing;
        const totalH = textH + (hasPalette ? spaceBetweenTextAndPalette + pSize : 0);
        let currentY = bottomCenterY - (totalH / 2); 

        ctx.textAlign = 'center';
        textLines.forEach(line => {
            ctx.font = `${customStyle}${line.size}px ${customFont}`;
            ctx.fillText(line.text, canvas.width / 2, currentY);
            currentY += line.size + lineSpacing;
        });

        if (hasPalette) {
            const palX = (canvas.width - pTotalW) / 2;
            const palY = bottomCenterY + (totalH / 2) - pSize;
            drawBrushPalette(ctx, appState.palette, palX, palY, pSize, pGap);
        }

    } else if (alignType === 'modern_left') {
        ctx.textBaseline = 'top';
        const textH = textLines.reduce((acc, l) => acc + l.size + lineSpacing, 0) - lineSpacing;
        let currentY = bottomCenterY - (textH / 2); 

        ctx.textAlign = 'left';
        textLines.forEach(line => {
            ctx.font = `${customStyle}${line.size}px ${customFont}`;
            ctx.fillText(line.text, ml, currentY);
            currentY += line.size + lineSpacing;
        });

        if (hasPalette) {
            const palX = canvas.width - mr - pTotalW;
            const palY = bottomCenterY - (pSize / 2); 
            drawBrushPalette(ctx, appState.palette, palX, palY, pSize, pGap);
        }

    } else if (alignType === 'split') {
        ctx.textBaseline = 'middle';
        const textH = Math.max(sizeMain, sizeExif);
        const totalH = textH + (hasPalette ? spaceBetweenTextAndPalette + pSize : 0);
        const textDrawY = bottomCenterY - (totalH / 2) + (textH / 2);

        ctx.font = `${customStyle}${sizeExif}px ${customFont}`;
        if (leftText) { ctx.textAlign = 'left'; ctx.fillText(leftText, ml, textDrawY); }
        if (rightText) { ctx.textAlign = 'right'; ctx.fillText(rightText, canvas.width - mr, textDrawY); }

        ctx.font = `${customStyle}${sizeMain}px ${customFont}`;
        if (centerText) { ctx.textAlign = 'center'; ctx.fillText(centerText, canvas.width / 2, textDrawY); }

        if (hasPalette) {
            const palX = (canvas.width - pTotalW) / 2;
            const palY = bottomCenterY + (totalH / 2) - pSize;
            drawBrushPalette(ctx, appState.palette, palX, palY, pSize, pGap); 
        }
    }

    function drawBrushPalette(context, colors, startX, startY, size, gap) {
        const brushPath = new Path2D('M12,30 L25,12 L45,22 L65,8 L85,25 L98,15 L92,42 L100,65 L82,82 L90,98 L65,85 L42,95 L22,82 L5,95 L12,65 L2,42 Z');
        
        colors.forEach((color, i) => {
            context.save();
            context.translate(startX + (i * (size + gap)), startY);
            context.scale(size / 100, size / 100);
            context.fillStyle = color;
            context.fill(brushPath);
            context.restore();
        });
    }
}