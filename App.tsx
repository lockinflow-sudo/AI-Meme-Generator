import React, { useState, useCallback, useEffect } from 'react';
import { Controls } from './components/Controls';
import { ImagePreview } from './components/ImagePreview';
import { generateCaptions, editImage, fileToBase64, imageUrlToBase64, getTrendingMemes } from './services/geminiService';
import type { ImageData, MemeTemplate } from './types';
import { FONTS } from './constants';


function App() {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([]);
  const [editText, setEditText] = useState<string>('');
  
  // Text 1 customization state
  const [captionText, setCaptionText] = useState<string>('');
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>(FONTS[0].fontFamily);
  const [fontSize, setFontSize] = useState<number>(50);
  const [fontColor, setFontColor] = useState<string>('#FFFFFF');
  const [textCoordinates, setTextCoordinates] = useState({ x: 0.5, y: 0.15 });
  const [isTopTextActive, setIsTopTextActive] = useState(false);

  // Text 2 customization state
  const [captionTextTwo, setCaptionTextTwo] = useState<string>('');
  const [selectedFontFamilyTwo, setSelectedFontFamilyTwo] = useState<string>(FONTS[0].fontFamily);
  const [fontSizeTwo, setFontSizeTwo] = useState<number>(50);
  const [fontColorTwo, setFontColorTwo] = useState<string>('#FFFFFF');
  const [textCoordinatesTwo, setTextCoordinatesTwo] = useState({ x: 0.5, y: 0.85 });
  const [isBottomTextActive, setIsBottomTextActive] = useState(false);


  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allTemplates, setAllTemplates] = useState<MemeTemplate[]>([]);
  const [templates, setTemplates] = useState<MemeTemplate[]>([]);
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(true);

  const clearState = () => {
    setCaptionText('');
    setCaptionTextTwo('');
    setSuggestedCaptions([]);
    setEditText('');
    setError(null);
    setSelectedFontFamily(FONTS[0].fontFamily);
    setFontSize(50);
    setFontColor('#FFFFFF');
    setTextCoordinates({ x: 0.5, y: 0.15 });
    setIsTopTextActive(false);
    setSelectedFontFamilyTwo(FONTS[0].fontFamily);
    setFontSizeTwo(50);
    setFontColorTwo('#FFFFFF');
    setTextCoordinatesTwo({ x: 0.5, y: 0.85 });
    setIsBottomTextActive(false);
  };

  const refreshDisplayedTemplates = useCallback((sourceTemplates: MemeTemplate[]) => {
    const shuffled = [...sourceTemplates].sort(() => 0.5 - Math.random());
    setTemplates(shuffled.slice(0, 6));
  }, []);

  const fetchAllTemplates = useCallback(async () => {
    setIsFetchingTemplates(true);
    setError(null);
    let fetchedTemplates: MemeTemplate[] = [];

    try {
      fetchedTemplates = await getTrendingMemes();
    } catch (e) {
      console.error("Could not load trending memes.", e);
      setError("Could not load trending memes. Please check your connection and try refreshing.");
    } finally {
      setAllTemplates(fetchedTemplates);
      refreshDisplayedTemplates(fetchedTemplates);
      setIsFetchingTemplates(false);
    }
  }, [refreshDisplayedTemplates]);

  useEffect(() => {
    fetchAllTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshTemplates = useCallback(() => {
    if (allTemplates.length > 0) {
      refreshDisplayedTemplates(allTemplates);
    } else {
      // If there are no templates, refreshing should try fetching them again
      fetchAllTemplates();
    }
  }, [allTemplates, refreshDisplayedTemplates, fetchAllTemplates]);

  const handleSearchTemplates = (query: string) => {
    if (!query.trim()) {
      handleRefreshTemplates();
      return;
    }
    const lowerCaseQuery = query.toLowerCase();
    const filtered = allTemplates.filter(t => 
      t.name.toLowerCase().includes(lowerCaseQuery)
    );
    setTemplates(filtered.slice(0, 6));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        clearState();
        const { base64, mimeType } = await fileToBase64(file);
        const url = URL.createObjectURL(file);
        const data = { base64, mimeType, url };
        setImageData(data);
        setOriginalImageData(data);
      } catch (e) {
        setError('Failed to process image file.');
        console.error(e);
      }
    }
  };

  const handleTemplateSelect = async (template: MemeTemplate) => {
    try {
      clearState();
      setImageData(null); // Clear image to show loading state
      setOriginalImageData(null);
      const { base64, mimeType } = await imageUrlToBase64(template.url);
      const dataUrl = `data:${mimeType};base64,${base64}`;
      const data = { base64, mimeType, url: dataUrl };
      setImageData(data);
      setOriginalImageData(data);
    } catch (e) {
      setError('Failed to load template image. Please try another or upload your own.');
      console.error(e);
      setImageData(null);
    }
  };

  const handleGenerateCaptions = useCallback(async () => {
    if (!imageData || !imageData.base64) {
      setError("Please select and wait for an image to load before generating captions.");
      return;
    }
    setIsGeneratingCaptions(true);
    setError(null);
    setSuggestedCaptions([]);
    try {
      const captions = await generateCaptions(imageData.base64, imageData.mimeType);
      setSuggestedCaptions(captions);
    } catch (e) {
      setError("Couldn't generate captions. The AI might be busy. Please try again.");
      console.error(e);
    } finally {
      setIsGeneratingCaptions(false);
    }
  }, [imageData]);

  const handleEditImage = useCallback(async () => {
    if (!originalImageData || !originalImageData.base64) {
      setError("Please select and wait for an image to load before editing.");
      return;
    }
    if (!editText.trim()) {
      setError("Please enter a description of the edit you want to make.");
      return;
    }
    setIsEditingImage(true);
    setError(null);
    try {
      const { base64, mimeType } = await editImage(originalImageData.base64, originalImageData.mimeType, editText);
      const url = `data:${mimeType};base64,${base64}`;
      const data = { base64, mimeType, url };
      setImageData(data);
    } catch (e) {
      setError("Couldn't edit the image. Please try again with a different prompt.");
      console.error(e);
    } finally {
      setIsEditingImage(false);
    }
  }, [originalImageData, editText]);

  const drawText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    font: string,
    size: number,
    color: string,
    coords: { x: number, y: number }
  ) => {
      const padding = 20;
      const maxWidth = ctx.canvas.width - padding * 2;
      const lineHeight = size * 1.2;

      ctx.font = `bold ${size}px ${font}`;
      ctx.fillStyle = color;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = Math.max(1, Math.floor(size / 15));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const words = text.toUpperCase().split(' ');
      const lines: string[] = [];
      
      if (words.length > 0) {
        let currentLine = words[0];
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const testLine = `${currentLine} ${word}`;
            const metrics = ctx.measureText(testLine);
            if (metrics.width < maxWidth) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
      }
      
      const totalTextHeight = lines.length * lineHeight;
      const textX = coords.x * ctx.canvas.width;
      const textY = (coords.y * ctx.canvas.height) - (totalTextHeight / 2) + (lineHeight / 2);
      
      let currentY = textY;
      for (const line of lines) {
        ctx.strokeText(line, textX, currentY);
        ctx.fillText(line, textX, currentY);
        currentY += lineHeight;
      }
  };


  const handleDownload = () => {
    if (!imageData?.url || (!captionText && !captionTextTwo)) {
      setError("Please add at least one caption before downloading.");
      return;
    }
    setError(null);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError("Could not create a canvas to generate the meme.");
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      if (captionText) {
        drawText(ctx, captionText, selectedFontFamily, fontSize, fontColor, textCoordinates);
      }

      if (captionTextTwo) {
        drawText(ctx, captionTextTwo, selectedFontFamilyTwo, fontSizeTwo, fontColorTwo, textCoordinatesTwo);
      }

      const link = document.createElement('a');
      link.download = 'ai-meme.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.onerror = () => {
      setError("Failed to load image for download. An unexpected error occurred.");
    };

    img.src = imageData.url;
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm shadow-lg p-4 sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-center">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
            AI Meme Generator
          </span>
        </h1>
      </header>
      <main className="flex flex-col lg:flex-row p-4 gap-4">
        <Controls
          onImageUpload={handleImageUpload}
          onTemplateSelect={handleTemplateSelect}
          onGenerateCaptions={handleGenerateCaptions}
          onEditImage={handleEditImage}
          onDownload={handleDownload}
          
          captionText={captionText}
          setCaptionText={setCaptionText}
          selectedFont={selectedFontFamily}
          onFontChange={setSelectedFontFamily}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          fontColor={fontColor}
          onFontColorChange={setFontColor}
          isTopTextActive={isTopTextActive}
          setIsTopTextActive={setIsTopTextActive}

          captionTextTwo={captionTextTwo}
          setCaptionTextTwo={setCaptionTextTwo}
          selectedFontTwo={selectedFontFamilyTwo}
          onFontChangeTwo={setSelectedFontFamilyTwo}
          fontSizeTwo={fontSizeTwo}
          onFontSizeChangeTwo={setFontSizeTwo}
          fontColorTwo={fontColorTwo}
          onFontColorChangeTwo={setFontColorTwo}
          isBottomTextActive={isBottomTextActive}
          setIsBottomTextActive={setIsBottomTextActive}

          suggestedCaptions={suggestedCaptions}
          isGeneratingCaptions={isGeneratingCaptions}
          isEditingImage={isEditingImage}
          editText={editText}
          setEditText={setEditText}
          hasImage={!!imageData}
          error={error}
          templates={templates}
          isFetchingTemplates={isFetchingTemplates}
          onRefreshTemplates={handleRefreshTemplates}
          onSearchTemplates={handleSearchTemplates}
        />
        <ImagePreview
          imageUrl={imageData?.url || null}
          captionText={captionText}
          fontFamily={selectedFontFamily}
          fontSize={fontSize}
          fontColor={fontColor}
          textCoordinates={textCoordinates}
          onTextCoordinatesChange={setTextCoordinates}
          captionTextTwo={captionTextTwo}
          fontFamilyTwo={selectedFontFamilyTwo}
          fontSizeTwo={fontSizeTwo}
          fontColorTwo={fontColorTwo}
          textCoordinatesTwo={textCoordinatesTwo}
          onTextCoordinatesChangeTwo={setTextCoordinatesTwo}
        />
      </main>
    </div>
  );
}

export default App;
