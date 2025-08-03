"use client";

import React, { useState, useTransition, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Wand2, BookOpen, Upload, Eraser, Pen, Menu, Globe, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { phoneticBreakdown, type PhoneticBreakdownOutput } from '@/ai/flows/phonetic-breakdown';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';


const englishAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const englishLowercaseAlphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
const englishPhonics = englishAlphabet.map((c, i) => `${c}${englishLowercaseAlphabet[i]}`);
const burmeseAlphabet = 'ကခဂဃငစဆဇဈညဋဌဍဎဏတထဒဓနပဖဗဘမယရလဝသဟဠအ'.split('');
const englishNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const burmeseNumbers = ['၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉', '၁၀', '၁၁', '၁၂', '၁၃', '၁၄', '၁၅', '၁၆', '၁၇', '၁၈', '၁၉', '၂၀'];

const phonicSounds: { [key: string]: { text: string } } = {
    'Aa': { text: "A as in apple" },
    'Bb': { text: 'B as in bell' },
    'Cc': { text: 'C as in cat' },
    'Dd': { text: 'D as in dog' },
    'Ee': { text: 'E as in ear' },
    'Ff': { text: 'F as in fish' },
    'Gg': { text: 'G as in goose' },
    'Hh': { text: 'H as in hut' },
    'Ii': { text: 'I as in ice' },
    'Jj': { text: 'J as in jacket' },
    'Kk': { text: 'K as in kite' },
    'Ll': { text: 'L as in lion' },
    'Mm': { text: 'M as in mouse' },
    'Nn': { text: 'N as in nail' },
    'Oo': { text: 'O as in orange' },
    'Pp': { text: 'P as in pencil' },
    'Qq': { text: 'Q as in queen' },
    'Rr': { text: 'R as in ring' },
    'Ss': { text: 'S as in sun' },
    'Tt': { text: 'T as in top' },
    'Uu': { text: 'U as in umbrella' },
    'Vv': { text: 'V as in violin' },
    'Ww': { text: 'W as in whistle' },
    'Xx': { text: 'X as in xylophone' },
    'Yy': { text: 'Y as in yoke' },
    'Zz': { text: 'Z as in zebra' }
};

const alphabets = {
  english: englishAlphabet,
  english_lowercase: englishLowercaseAlphabet,
  english_phonics: englishPhonics,
  english_phonics_chant: englishPhonics,
  burmese: burmeseAlphabet,
  english_numbers: englishNumbers,
  burmese_numbers: burmeseNumbers,
};

const alphabetLabels = {
    english: "English (A-Z)",
    english_lowercase: "English (a-z)",
    english_phonics: "English letters' songs",
    english_phonics_chant: "Chant -ABC",
    burmese: "မြန်မာဗျည်းများ",
    english_numbers: "Numbers (1-10)",
    burmese_numbers: "ကိန်းများ (၁-၂၀)",
}

type AlphabetType = 'english' | 'english_lowercase' | 'burmese' | 'english_numbers' | 'burmese_numbers' | 'english_phonics' | 'english_phonics_chant';
type ViewMode = 'learn' | 'trace';
type Accent = 'american' | 'british';


export function AsmKindergarten() {
  const [currentAlphabet, setCurrentAlphabet] = useState<AlphabetType>('english');
  const [accent, setAccent] = useState<Accent>('american');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [word, setWord] = useState('');
  const [breakdown, setBreakdown] = useState<PhoneticBreakdownOutput | null>(null);
  const [customSounds, setCustomSounds] = useState<Record<string, string>>({});
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>('learn');
  const [isDrawing, setIsDrawing] = useState(false);
  
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const soundFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    try {
      const storedSounds = localStorage.getItem('customSounds');
      if (storedSounds) {
        setCustomSounds(JSON.parse(storedSounds));
      }
      const storedImages = localStorage.getItem('customImages');
      if (storedImages) {
        setCustomImages(JSON.parse(storedImages));
      }
    } catch (error) {
      console.error("Failed to load custom data from local storage", error);
    }
  }, []);

  const activeAlphabet = alphabets[currentAlphabet];
  const currentLetterRaw = activeAlphabet[currentIndex];
  const currentLetter = currentLetterRaw;
  const isBurmese = currentAlphabet.startsWith('burmese');
  const isPhonics = currentAlphabet === 'english_phonics' || currentAlphabet === 'english_phonics_chant';
  const customImage = customImages[currentLetterRaw];
  
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = `bold ${isBurmese ? '14rem' : '16rem'} "${isBurmese ? 'sans-serif' : 'PT Sans'}"`;
    ctx.fillStyle = 'hsl(var(--muted-foreground) / 0.1)';
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    
    ctx.strokeText(currentLetter, x, y);
    ctx.fillText(currentLetter, x, y);
  }, [currentLetter, isBurmese]);

  useEffect(() => {
    if (viewMode === 'trace') {
        setupCanvas();
    }
  }, [currentIndex, currentAlphabet, viewMode, setupCanvas]);
  
  useEffect(() => {
    window.addEventListener('resize', setupCanvas);
    return () => {
        window.removeEventListener('resize', setupCanvas);
    }
  }, [setupCanvas]);


  const handleAlphabetChange = (value: string) => {
    setCurrentAlphabet(value as AlphabetType);
    setCurrentIndex(0);
    setBreakdown(null);
  };

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + activeAlphabet.length) % activeAlphabet.length);
  }, [activeAlphabet.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % activeAlphabet.length);
  }, [activeAlphabet.length]);

  const handlePlaySound = useCallback(() => {
    const customSound = customSounds[currentLetterRaw];
    if (customSound) {
      const audio = new Audio(customSound);
      audio.play().catch(err => {
        console.error("Error playing custom audio:", err);
        toast({ title: "Could not play custom sound.", variant: "destructive" });
      });
      return;
    }
    
    let textToSpeak = currentLetter;
    if (isPhonics) {
      textToSpeak = phonicSounds[currentLetterRaw]?.text || currentLetter;
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (isBurmese) {
        utterance.lang = 'my-MM';
      } else {
        utterance.lang = accent === 'american' ? 'en-US' : 'en-GB';
      }
      speechSynthesis.speak(utterance);
    } else {
      toast({ title: "Speech synthesis not supported", description: "Your browser does not support the Web Speech API.", variant: "destructive" });
    }
  }, [currentLetter, currentLetterRaw, customSounds, isBurmese, isPhonics, toast, accent]);

  const handlePhoneticBreakdown = async (formData: FormData) => {
    const wordToBreakdown = formData.get('word') as string;
    if (!wordToBreakdown.trim()) {
      toast({ title: "Please enter a word.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      setBreakdown(null);
      try {
        const result = await phoneticBreakdown({ word: wordToBreakdown });
        setBreakdown(result);
      } catch (error) {
        console.error("Phonetic breakdown error:", error);
        toast({ title: "An Error Occurred", description: "Could not get the phonetic breakdown. Please try again.", variant: "destructive" });
      }
    });
  };

  const handleSoundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File is too large", description: "Please upload an audio file smaller than 5MB.", variant: "destructive" });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newCustomSounds = { ...customSounds, [currentLetterRaw]: dataUrl };
      setCustomSounds(newCustomSounds);
      try {
        localStorage.setItem('customSounds', JSON.stringify(newCustomSounds));
        toast({ title: "Success!", description: `Custom sound for '${currentLetter}' has been saved.`});
      } catch (error) {
        console.error("Failed to save custom sound to local storage", error);
        toast({ title: "An Error Occurred", description: "Could not save the custom sound. The browser storage might be full.", variant: "destructive" });
      }
    };
    reader.onerror = () => {
        toast({ title: "An Error Occurred", description: "Failed to read the audio file.", variant: "destructive" });
    }
    reader.readAsDataURL(file);
    event.target.value = '';
  };
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File is too large", description: "Please upload an image file smaller than 5MB.", variant: "destructive" });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newCustomImages = { ...customImages, [currentLetterRaw]: dataUrl };
      setCustomImages(newCustomImages);
      try {
        localStorage.setItem('customImages', JSON.stringify(newCustomImages));
        toast({ title: "Success!", description: `Custom image for '${currentLetter}' has been saved.`});
      } catch (error) {
        console.error("Failed to save custom image to local storage", error);
        toast({ title: "An Error Occurred", description: "Could not save the custom image. The browser storage might be full.", variant: "destructive" });
      }
    };
    reader.onerror = () => {
        toast({ title: "An Error Occurred", description: "Failed to read the image file.", variant: "destructive" });
    }
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleUploadSoundClick = () => {
    soundFileInputRef.current?.click();
  };
  
  const handleUploadImageClick = () => {
    imageFileInputRef.current?.click();
  };

  
  const disablePhonetic = currentAlphabet === 'burmese' || currentAlphabet === 'burmese_numbers' || currentAlphabet === 'english_numbers' || currentAlphabet === 'english_phonics' || currentAlphabet === 'english_phonics_chant';

  const getEventCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const touch = (e as React.TouchEvent).touches?.[0];
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getEventCoordinates(e);
    if (!coords) return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const coords = getEventCoordinates(e);
    if (!coords) return;
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };
  
  const stopDrawing = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
      setupCanvas();
  };
  
  const phonicInfo = phonicSounds[currentLetterRaw];

  const renderLearnCard = () => (
    <Card className="w-full shadow-xl transition-all duration-300 hover:shadow-2xl mt-4 bg-card">
      <CardContent className="p-6 flex flex-col items-center justify-center">
        <div className="flex items-center justify-between w-full mb-6">
          <Button onClick={handlePrevious} variant="ghost" size="lg" aria-label="Previous">
            <ChevronLeft className="h-12 w-12" />
          </Button>
          <div
            key={currentAlphabet + currentIndex + 'learn'}
            className="animate-in fade-in zoom-in-95 duration-500 flex-grow flex flex-row items-center justify-center cursor-pointer group w-full"
            onClick={handlePlaySound}
            role="button"
            aria-label={`Play sound for ${currentLetter}`}
          >
            <div className="w-1/2 flex justify-center items-center p-2">
              {customImage ? (
                  <img src={customImage} alt={`Custom visual for ${currentLetter}`} className="w-full h-auto max-h-64 object-contain rounded-lg group-hover:scale-105 transition-transform duration-200" />
              ) : (
                <div className="w-full h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="w-1/2 flex flex-col items-center justify-center p-2">
              <span
              className={cn(
                  "text-[10rem] md:text-[12rem] font-bold text-center text-primary font-headline select-none group-hover:scale-110 transition-transform duration-200",
              )}
              style={{ fontFamily: isBurmese ? 'sans-serif' : undefined }}
              >
              {currentLetter}
              </span>
              {isPhonics && phonicInfo?.text && <p className='font-semibold text-muted-foreground mt-2 text-center'>{phonicInfo.text}</p>}
            </div>
          </div>
          <Button onClick={handleNext} variant="ghost" size="lg" aria-label="Next">
            <ChevronRight className="h-12 w-12" />
          </Button>
        </div>
      </CardContent>
        <CardFooter className="flex justify-center gap-4 p-6 border-t">
            <Button onClick={handleUploadSoundClick} variant="outline" size="lg">
                <Upload className="mr-2 h-6 w-6" />
                Upload Sound
            </Button>
            <input
                type="file"
                ref={soundFileInputRef}
                onChange={handleSoundUpload}
                className="hidden"
                accept="audio/*"
            />
            <Button onClick={handleUploadImageClick} variant="outline" size="lg">
                <ImageIcon className="mr-2 h-6 w-6" />
                Upload Photo
            </Button>
            <input
                type="file"
                ref={imageFileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
            />
        </CardFooter>
    </Card>
  );

  const renderTraceCard = () => (
    <Card className="w-full shadow-xl mt-4 bg-card">
      <CardContent className="p-2 sm:p-4 flex flex-col items-center justify-center">
        <div className="flex items-center justify-between w-full mb-4">
          <Button onClick={handlePrevious} variant="ghost" size="lg" aria-label="Previous">
            <ChevronLeft className="h-12 w-12" />
          </Button>
            <div className='flex flex-col items-center gap-2'>
              <h2 className='text-xl font-semibold text-muted-foreground'>Trace the letter</h2>
              <Button onClick={handlePlaySound} variant="ghost" size="sm" aria-label={`Play sound for ${currentLetter}`}>
                <span className="text-4xl font-bold text-primary font-headline">{currentLetter}</span>
              </Button>
            </div>
          <Button onClick={handleNext} variant="ghost" size="lg" aria-label="Next">
            <ChevronRight className="h-12 w-12" />
          </Button>
        </div>
        <div className="w-full aspect-video bg-muted/20 rounded-lg cursor-crosshair">
          <canvas 
            ref={canvasRef}
            className='w-full h-full'
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-center p-4 border-t">
        <Button onClick={clearCanvas} variant="outline">
          <Eraser className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </CardFooter>
    </Card>
  );
  

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
            <BookOpen className="h-10 w-10 text-accent" />
            <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground">
            ASM Kindergarten
            </h1>
        </div>
        <p className="text-lg text-muted-foreground font-headline">Your friendly guide to letters and their sounds.</p>
      </header>
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-3 w-full">
            <div className="flex justify-between items-center w-full gap-4 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className='flex-grow'>
                    <Menu className="mr-2 h-4 w-4" />
                    {alphabetLabels[currentAlphabet]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup value={currentAlphabet} onValueChange={handleAlphabetChange}>
                      <DropdownMenuLabel>English</DropdownMenuLabel>
                      <DropdownMenuRadioItem value="english">English (A-Z)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="english_lowercase">English (a-z)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="english_phonics">{alphabetLabels.english_phonics}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="english_phonics_chant">{alphabetLabels.english_phonics_chant}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="english_numbers">{alphabetLabels.english_numbers}</DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Burmese</DropdownMenuLabel>
                      <DropdownMenuRadioItem value="burmese">{alphabetLabels.burmese}</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="burmese_numbers">{alphabetLabels.burmese_numbers}</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className='flex-grow'>
                    <Globe className="mr-2 h-4 w-4" />
                    {accent === 'american' ? 'American Accent' : 'British Accent'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuRadioGroup value={accent} onValueChange={(v) => setAccent(v as Accent)}>
                      <DropdownMenuLabel>Accent</DropdownMenuLabel>
                      <DropdownMenuRadioItem value="american">American</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="british">British</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>


             <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="learn">
                        <BookOpen className="mr-2"/>Learn
                    </TabsTrigger>
                    <TabsTrigger value="trace">
                        <Pen className="mr-2"/>Trace
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="learn">
                  {renderLearnCard()}
                </TabsContent>
                <TabsContent value="trace">
                  {renderTraceCard()}
                </TabsContent>
            </Tabs>
        </div>


        <Card className="lg:col-span-2 w-full shadow-xl transition-all duration-300 hover:shadow-2xl bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="text-accent" />
              Phonetic Breakdown
            </CardTitle>
            <CardDescription>Enter a word to see its phonetic breakdown, powered by AI. (English words only)</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              ref={formRef}
              action={handlePhoneticBreakdown}
              onSubmit={(e) => {
                e.preventDefault();
                handlePhoneticBreakdown(new FormData(e.currentTarget));
                formRef.current?.reset();
              }}
              className="flex items-center gap-2"
            >
              <Input
                name="word"
                placeholder="e.g., 'phoneme'"
                className="flex-grow"
                disabled={isPending || disablePhonetic}
                autoComplete="off"
              />
              <Button type="submit" disabled={isPending || disablePhonetic} className="bg-accent text-accent-foreground hover:bg-accent/90" aria-label="Get phonetic breakdown">
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Go'}
              </Button>
            </form>
          </CardContent>

            {(isPending || breakdown) && (
                 <CardFooter className="flex flex-col items-start gap-4 p-6 border-t">
                 {isPending && (
                   <div className="flex items-center justify-center w-full h-32">
                     <Loader2 className="h-8 w-8 animate-spin text-accent" />
                   </div>
                 )}
                 {breakdown && (
                   <div className="animate-in fade-in duration-500 w-full space-y-4">
                     <div>
                       <h3 className="font-semibold text-lg font-headline">Phonemes</h3>
                       <p className="text-2xl font-mono text-primary bg-primary/10 p-3 rounded-md">
                         {breakdown.phonemes.join(' - ')}
                       </p>
                     </div>
                     <div>
                       <h3 className="font-semibold text-lg font-headline">Explanation</h3>
                       <p className="text-muted-foreground leading-relaxed">{breakdown.explanation}</p>
                     </div>
                   </div>
                 )}
               </CardFooter>
            )}
        </Card>
      </main>
    </div>
  );
}
