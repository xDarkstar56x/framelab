import { framePresets } from './presets.js';
import { renderFrame } from './canvas-engine.js';

const canvas = document.getElementById('previewCanvas');
const inputs = {
    image: document.getElementById('inputImage'),
    preset: document.getElementById('presetSelect'),
    ratio: document.getElementById('inRatio'),
    cropX: document.getElementById('inCropX'), 
    cropY: document.getElementById('inCropY'), 
    borderTop: document.getElementById('inBorderTop'),
    borderBottom: document.getElementById('inBorderBottom'),
    shadow: document.getElementById('inShadow'), 
    textAlignment: document.getElementById('inTextAlignment'),
    fontSizeMain: document.getElementById('inFontSizeMain'), 
    fontSizeExif: document.getElementById('inFontSizeExif'), 
    font: document.getElementById('inFont'),
    bold: document.getElementById('inBold'),
    italic: document.getElementById('inItalic'),
    author: document.getElementById('inAuthor'),
    camera: document.getElementById('inCamera'),
    lens: document.getElementById('inLens'),
    focal: document.getElementById('inFocal'),
    aperture: document.getElementById('inAperture'),
    shutter: document.getElementById('inShutter'),
    iso: document.getElementById('inIso'),
    date: document.getElementById('inDate'),
    gps: document.getElementById('inGPS'),
    showRes: document.getElementById('inShowRes')
};

const exportUI = {
    format: document.getElementsByName('outFormat'),
    quality: document.getElementById('outQuality'),
    scale: document.getElementById('outScale'),
    lblQuality: document.getElementById('lblQuality'),
    lblScale: document.getElementById('lblScale'),
    statTotal: document.getElementById('statTotalDim'),
    statImg: document.getElementById('statImageDim'),
    statSize: document.getElementById('statSize'),
    btnDownload: document.getElementById('btnConfirmDownload')
};

const globalState = { image: null, palette: [] };
let activeBgColor = "#F2F2F2";
let activeTextColor = "#0A0C0D";

const colorThief = new ColorThief();

document.querySelectorAll('#bgSwatches .color-swatch').forEach(sw => {
    sw.addEventListener('click', (e) => {
        document.querySelectorAll('#bgSwatches .color-swatch').forEach(s => s.classList.remove('active'));
        e.target.classList.add('active');
        activeBgColor = e.target.dataset.color;
        updatePreview();
    });
});
document.querySelectorAll('#textSwatches .color-swatch').forEach(sw => {
    sw.addEventListener('click', (e) => {
        document.querySelectorAll('#textSwatches .color-swatch').forEach(s => s.classList.remove('active'));
        e.target.classList.add('active');
        activeTextColor = e.target.dataset.color;
        updatePreview();
    });
});

function updateCropControls() {
    if (!globalState.image || inputs.ratio.value === 'original') {
        inputs.cropX.disabled = true; inputs.cropY.disabled = true;
        inputs.cropX.value = 0; inputs.cropY.value = 0;
        return;
    }
    const [w, h] = inputs.ratio.value.split(':').map(Number);
    const targetRatio = w / h;
    const imgRatio = globalState.image.width / globalState.image.height;
    
    if (imgRatio > targetRatio + 0.01) {
        inputs.cropX.disabled = false; inputs.cropY.disabled = true; inputs.cropY.value = 0;
    } else if (imgRatio < targetRatio - 0.01) {
        inputs.cropX.disabled = true; inputs.cropX.value = 0; inputs.cropY.disabled = false;
    } else {
        inputs.cropX.disabled = true; inputs.cropY.disabled = true;
        inputs.cropX.value = 0; inputs.cropY.value = 0;
    }
}

inputs.preset.addEventListener('change', () => {
    const p = framePresets[inputs.preset.value];
    if (!p) return;
    
    inputs.borderTop.value = p.borderTop;
    inputs.borderBottom.value = p.borderBottom;
    inputs.textAlignment.value = p.align;
    inputs.font.value = p.font;
    inputs.bold.checked = p.bold;
    inputs.italic.checked = p.italic;
    inputs.shadow.checked = p.shadow;
    
    activeBgColor = p.bg;
    activeTextColor = p.text;
    
    document.querySelectorAll('#bgSwatches .color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === p.bg));
    document.querySelectorAll('#textSwatches .color-swatch').forEach(s => s.classList.toggle('active', s.dataset.color === p.text));
    
    updatePreview();
});

window.addEventListener('DOMContentLoaded', () => {
    inputs.author.value = "Between Seasons";
    inputs.camera.value = "Sony a7 IV";
    inputs.lens.value = "Tamron 28-75mm f/2.8";
    inputs.focal.value = "28mm";
    inputs.aperture.value = "f/4";
    inputs.shutter.value = "1/1250s";
    inputs.iso.value = "ISO 125";
    inputs.date.value = "10 Mar 2024 12:45"; 
    inputs.gps.value = "20.6596° N, 103.3496° W"; 

    const preset = framePresets[inputs.preset.value];
    activeBgColor = preset.bg;
    activeTextColor = preset.text;

    const img = new Image();
    img.onload = () => {
        globalState.image = img;
        try {
            const colors = colorThief.getPalette(img, 5);
            globalState.palette = colors.map(c => `rgb(${c[0]},${c[1]},${c[2]})`);
        } catch(e) { globalState.palette = []; }
        updateCropControls();
        updatePreview();
    };
    img.src = 'image_133cda.jpg'; 
});

Object.keys(inputs).forEach(key => {
    if (key !== 'image' && key !== 'preset') {
        const el = inputs[key];
        const eventType = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color') ? 'change' : 'input';
        el.addEventListener(eventType, () => {
            if (key === 'ratio') updateCropControls();
            updatePreview();
        });
    }
});

inputs.image.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const exif = await exifr.parse(file);
        if (exif) {
            inputs.camera.value = exif.Model || '';
            inputs.lens.value = exif.LensModel || '';
            inputs.focal.value = exif.FocalLength ? `${exif.FocalLength}mm` : '';
            inputs.aperture.value = exif.FNumber ? `f/${exif.FNumber}` : '';
            inputs.iso.value = exif.ISO ? `ISO ${exif.ISO}` : '';
            
            if (exif.ExposureTime) {
                inputs.shutter.value = exif.ExposureTime < 1 ? `1/${Math.round(1/exif.ExposureTime)}s` : `${exif.ExposureTime}s`;
            }
            
            if (exif.DateTimeOriginal) {
                const d = new Date(exif.DateTimeOriginal);
                inputs.date.value = d.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
            } else {
                inputs.date.value = '';
            }

            if (exif.latitude && exif.longitude) {
                const latRef = exif.latitude >= 0 ? 'N' : 'S';
                const lonRef = exif.longitude >= 0 ? 'E' : 'W';
                inputs.gps.value = `${Math.abs(exif.latitude).toFixed(4)}° ${latRef}, ${Math.abs(exif.longitude).toFixed(4)}° ${lonRef}`;
            } else {
                inputs.gps.value = '';
            }
        }
    } catch(err) { console.log("Sin EXIF", err); }

    const reader = new FileReader();
    reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
            globalState.image = img;
            try {
                const colors = colorThief.getPalette(img, 5);
                globalState.palette = colors.map(c => `rgb(${c[0]},${c[1]},${c[2]})`);
            } catch(e) { globalState.palette = []; }
            
            inputs.cropX.value = 0; inputs.cropY.value = 0;
            updateCropControls();
            updatePreview();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
});

function getCroppedImage(img, ratioString, offsetX_percent, offsetY_percent) {
    if (ratioString === 'original' || !img) return img;
    const [w, h] = ratioString.split(':').map(Number);
    const targetRatio = w / h;
    const imgRatio = img.width / img.height;
    
    let cropW = img.width, cropH = img.height, startX = 0, startY = 0;

    if (imgRatio > targetRatio) {
        cropW = img.height * targetRatio;
        const maxOffsetX = img.width - cropW;
        startX = maxOffsetX * ((offsetX_percent + 100) / 200);
    } else {
        cropH = img.width / targetRatio;
        const maxOffsetY = img.height - cropH;
        startY = maxOffsetY * ((offsetY_percent + 100) / 200);
    }

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW; cropCanvas.height = cropH;
    const ctx = cropCanvas.getContext('2d');
    ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
    return cropCanvas;
}

function updatePreview() {
    if (!globalState.image) return;

    const cropX = parseInt(inputs.cropX.value);
    const cropY = parseInt(inputs.cropY.value);
    const processedImage = getCroppedImage(globalState.image, inputs.ratio.value, cropX, cropY);
    const fontStyle = (inputs.italic.checked ? "italic " : "") + (inputs.bold.checked ? "bold" : "");

    const currentData = {
        author: inputs.author.value, camera: inputs.camera.value, lens: inputs.lens.value,
        focal: inputs.focal.value, aperture: inputs.aperture.value, shutter: inputs.shutter.value,
        iso: inputs.iso.value, date: inputs.date.value, gps: inputs.gps.value,
        palette: globalState.palette, bgColor: activeBgColor, textColor: activeTextColor,
        textAlignment: inputs.textAlignment.value, fontFamily: inputs.font.value, fontStyle: fontStyle.trim(),
        borderTop: parseInt(inputs.borderTop.value), borderBottom: parseInt(inputs.borderBottom.value),
        fontSizeMain: parseInt(inputs.fontSizeMain.value), fontSizeExif: parseInt(inputs.fontSizeExif.value),
        shadow: inputs.shadow.checked, showRes: inputs.showRes.checked
    };

    renderFrame(canvas, processedImage, currentData);
    if(document.getElementById('modalDownload').classList.contains('active')) updateExportStats();
}

function updateExportStats() {
    if (!globalState.image) return;

    const cropX = parseInt(inputs.cropX.value);
    const cropY = parseInt(inputs.cropY.value);
    const processedImage = getCroppedImage(globalState.image, inputs.ratio.value, cropX, cropY);
    
    const scaleFactor = parseInt(exportUI.scale.value) / 100;
    const qualityFactor = parseInt(exportUI.quality.value) / 100;
    
    let selectedFormat = 'image/jpeg';
    exportUI.format.forEach(radio => { if(radio.checked) selectedFormat = radio.value; });

    const imgW = Math.round(processedImage.width * scaleFactor);
    const imgH = Math.round(processedImage.height * scaleFactor);
    exportUI.statImg.innerText = `${imgW} × ${imgH} px`;

    const longestSide = Math.max(imgW, imgH);
    const userMt = inputs.borderTop.value / 100;
    const userMb = inputs.borderBottom.value / 100;

    const totalW = Math.round(imgW + (longestSide * userMt * 2));
    const totalH = Math.round(imgH + (longestSide * userMt) + (longestSide * userMb));
    exportUI.statTotal.innerText = `${totalW} × ${totalH} px`;

    const channels = selectedFormat === 'image/png' ? 4 : 3;
    const compressionBase = selectedFormat === 'image/png' ? 0.3 : 0.15;
    const bytesEst = totalW * totalH * channels * compressionBase * qualityFactor;
    exportUI.statSize.innerText = `${(bytesEst / (1024 * 1024)).toFixed(2)} MB`;
}

exportUI.scale.addEventListener('input', (e) => { exportUI.lblScale.innerText = `${e.target.value}%`; updateExportStats(); });
exportUI.quality.addEventListener('input', (e) => { exportUI.lblQuality.innerText = `${e.target.value}%`; updateExportStats(); });
exportUI.format.forEach(radio => radio.addEventListener('change', updateExportStats));

exportUI.btnDownload.addEventListener('click', () => {
    if (!globalState.image) return;
    exportUI.btnDownload.innerText = "Procesando...";
    
    setTimeout(() => {
        const scaleFactor = parseInt(exportUI.scale.value) / 100;
        const qualityVal = parseInt(exportUI.quality.value) / 100;
        let selectedFormat = 'image/jpeg', ext = 'jpg';
        exportUI.format.forEach(radio => { if(radio.checked) { selectedFormat = radio.value; ext = radio.value === 'image/png' ? 'png' : 'jpg'; } });

        const fontStyle = (inputs.italic.checked ? "italic " : "") + (inputs.bold.checked ? "bold" : "");
        const cropX = parseInt(inputs.cropX.value);
        const cropY = parseInt(inputs.cropY.value);

        const currentData = {
            author: inputs.author.value, camera: inputs.camera.value, lens: inputs.lens.value,
            focal: inputs.focal.value, aperture: inputs.aperture.value, shutter: inputs.shutter.value,
            iso: inputs.iso.value, date: inputs.date.value, gps: inputs.gps.value,
            palette: globalState.palette, bgColor: activeBgColor, textColor: activeTextColor,
            textAlignment: inputs.textAlignment.value, fontFamily: inputs.font.value, fontStyle: fontStyle.trim(),
            borderTop: parseInt(inputs.borderTop.value), borderBottom: parseInt(inputs.borderBottom.value),
            fontSizeMain: parseInt(inputs.fontSizeMain.value), fontSizeExif: parseInt(inputs.fontSizeExif.value),
            shadow: inputs.shadow.checked, showRes: inputs.showRes.checked
        };
        
        const exportCanvas = document.createElement('canvas');
        let targetImg = getCroppedImage(globalState.image, inputs.ratio.value, cropX, cropY);

        if (scaleFactor < 1) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = targetImg.width * scaleFactor;
            tempCanvas.height = targetImg.height * scaleFactor;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(targetImg, 0, 0, tempCanvas.width, tempCanvas.height);
            targetImg = tempCanvas;
        }

        renderFrame(exportCanvas, targetImg, currentData);

        exportCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `FrameLab-${Date.now()}.${ext}`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            
            exportUI.btnDownload.innerText = "Descargar";
            document.getElementById('modalOverlay').classList.remove('active');
        }, selectedFormat, qualityVal);
    }, 50);
});

const modalOverlay = document.getElementById('modalOverlay');
const modals = document.querySelectorAll('.modal-content');

function openModal(id) {
    if (!globalState.image && id === 'modalDownload') return alert("Carga una imagen primero.");
    modals.forEach(m => m.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    modalOverlay.classList.add('active');
    if(id === 'modalDownload') updateExportStats();
}

document.getElementById('btnOpenExport').addEventListener('click', () => openModal('modalDownload'));
document.getElementById('btnOpenDonate').addEventListener('click', () => openModal('modalDonate'));
document.getElementById('btnOpenFAQ').addEventListener('click', () => openModal('modalFAQ'));
document.getElementById('btnOpenAbout').addEventListener('click', () => openModal('modalAbout'));
document.getElementById('btnOpenPrivacy').addEventListener('click', () => openModal('modalPrivacy'));

document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => modalOverlay.classList.remove('active')));
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });