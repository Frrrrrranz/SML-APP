import { PDFDocument } from 'pdf-lib';

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|webp|gif|bmp)$/i;

export const SHEET_UPLOAD_ACCEPT = '.pdf,image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp';

const isPdfFile = (file: File): boolean => {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/') || IMAGE_EXT_REGEX.test(file.name);
};

const sanitizeFileName = (name: string): string => {
    return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'sheet-music';
};

const readAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
};

const readAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
};

const dataUrlToBytes = (dataUrl: string): Uint8Array => {
    const base64 = dataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const loadImageFromFile = async (file: File): Promise<HTMLImageElement> => {
    const dataUrl = await readAsDataUrl(file);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to decode image'));
        img.src = dataUrl;
    });
};

const convertImageFileToPngBytes = async (file: File): Promise<Uint8Array> => {
    const image = await loadImageFromFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to create canvas context');
    }

    // Fill white first so transparent areas don't become black in exported PDF pages.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    return dataUrlToBytes(canvas.toDataURL('image/png'));
};

const mergeImagesToPdf = async (imageFiles: File[]): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();

    for (const imageFile of imageFiles) {
        const mime = imageFile.type.toLowerCase();
        const ext = imageFile.name.split('.').pop()?.toLowerCase() || '';
        const isJpeg = mime === 'image/jpeg' || mime === 'image/jpg' || ext === 'jpg' || ext === 'jpeg';
        const isPng = mime === 'image/png' || ext === 'png';

        let embeddedImage;
        if (isJpeg) {
            const bytes = await readAsArrayBuffer(imageFile);
            embeddedImage = await pdfDoc.embedJpg(bytes);
        } else if (isPng) {
            const bytes = await readAsArrayBuffer(imageFile);
            embeddedImage = await pdfDoc.embedPng(bytes);
        } else {
            const pngBytes = await convertImageFileToPngBytes(imageFile);
            embeddedImage = await pdfDoc.embedPng(pngBytes);
        }

        const width = embeddedImage.width;
        const height = embeddedImage.height;
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width,
            height,
        });
    }

    return pdfDoc.save();
};

export const validateSheetUploadFiles = (files: File[]): string | null => {
    if (files.length === 0) return null;

    const invalidFile = files.find((file) => !isPdfFile(file) && !isImageFile(file));
    if (invalidFile) {
        return 'Only PDF or image files are supported (JPG/PNG/WEBP/GIF/BMP)';
    }

    const pdfCount = files.filter(isPdfFile).length;
    if (pdfCount > 1) {
        return 'Only one PDF can be uploaded at a time';
    }
    if (pdfCount === 1 && files.length > 1) {
        return 'PDF and images cannot be mixed in one upload';
    }

    return null;
};

export const prepareSheetUploadFile = async (
    files: File[],
    workId: string,
    title?: string
): Promise<File> => {
    if (files.length === 0) {
        throw new Error('No files selected');
    }

    if (files.length === 1 && isPdfFile(files[0])) {
        return files[0];
    }

    const imageFiles = files.filter(isImageFile);
    if (imageFiles.length === 0) {
        throw new Error('No valid image files selected');
    }

    const pdfBytes = await mergeImagesToPdf(imageFiles);
    const fileName = `${sanitizeFileName(title?.trim() || workId)}-images.pdf`;
    return new File([pdfBytes], fileName, { type: 'application/pdf' });
};

export const getSheetSelectionHint = (files: File[]): string => {
    if (files.length === 0) return '';
    if (files.length === 1 && isPdfFile(files[0])) return 'PDF';
    if (files.length === 1) return '1 image (will be merged into PDF)';
    return `${files.length} images (will be merged into PDF)`;
};
