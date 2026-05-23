// @ts-nocheck
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ContactForm } from '@/components/site/ContactForm';
import * as constants from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Check, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useDictionary } from '@/contexts/dictionary-context';
import { usePathname } from 'next/navigation';

export default function QuizPage() {
  const t = useDictionary();
  const tQuiz = t.QuizPage;
  const services = constants.getServices(t);
  const pathname = usePathname();
  const locale = pathname.split('/')[1];

  const propertyTypes = [
    { value: "office", label: tQuiz.property_types.office },
    { value: "business-center", label: tQuiz.property_types['business-center'] },
    { value: "shop", label: tQuiz.property_types.shop },
    { value: "clinic", label: tQuiz.property_types.clinic },
    { value: "warehouse", label: tQuiz.property_types.warehouse },
    { value: "other", label: tQuiz.property_types.other },
  ];

  const cleaningGoals = [
    { value: 'subscription', label: tQuiz.cleaning_goals.subscription, serviceSlug: '/abonentskiy-klining' },
    { value: 'general', label: tQuiz.cleaning_goals.general, serviceSlug: '/generalnaya-uborka' },
    { value: 'post-construction', label: tQuiz.cleaning_goals['post-construction'], serviceSlug: '/poslestroitelnaya-uborka' },
    { value: 'furniture', label: tQuiz.cleaning_goals.furniture, serviceSlug: '/himchistka-mebeli' },
    { value: 'windows', label: tQuiz.cleaning_goals.windows, serviceSlug: '/moika-okon' },
  ];

  const quizSteps = [
      { id: 1, title: tQuiz.property_type_title },
      { id: 2, title: tQuiz.cleaning_goal_title },
      { id: 3, title: tQuiz.area_title },
      { id: 4, title: tQuiz.result_title.replace('{service}', '') }
  ];

  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    propertyType: '',
    cleaningGoal: '',
    area: 100,
  });

  const handleValueChange = (key: keyof typeof answers, value: string | number) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, quizSteps.length));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  const startOver = () => {
      setStep(1);
      setAnswers({ propertyType: '', cleaningGoal: '', area: 100 });
  }

  const recommendedService = useMemo(() => {
    if (!answers.cleaningGoal) return null;
    const goal = cleaningGoals.find(g => g.value === answers.cleaningGoal);
    if (!goal) return null;
    return services.find(s => s.slug === goal.serviceSlug);
  }, [answers.cleaningGoal, services, cleaningGoals]);

  const progress = (step / (quizSteps.length -1)) * 100;
  const currentStepInfo = quizSteps[step - 1];
  const isNextDisabled = 
    (step === 1 && !answers.propertyType) ||
    (step === 2 && !answers.cleaningGoal);

  const getPropertyTypeGenitive = (propertyType: string) => {
    return tQuiz.property_type_genitive[propertyType] || tQuiz.property_type_genitive.other;
  }

  return (
    <div className="container py-12 md:py-24">
       <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl font-headline mb-2">
                {tQuiz.title}
            </h1>
            <p className="text-muted-foreground">{tQuiz.subtitle}</p>
        </div>

        <Card className="overflow-hidden">
             <div className="p-6">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-muted-foreground font-medium">{tQuiz.step_prefix} {step} {tQuiz.step_of} {quizSteps.length -1}</p>
                    <p className="text-sm font-semibold">{currentStepInfo.title}</p>
                </div>
                <Progress value={progress} className="w-full h-2" />
            </div>

            <CardContent className="p-6 !pt-0 min-h-[300px]">
                {step === 1 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-6">{tQuiz.property_type_title}</h2>
                        <RadioGroup 
                            value={answers.propertyType} 
                            onValueChange={(value) => handleValueChange('propertyType', value)}
                            className="grid grid-cols-2 gap-4"
                        >
                            {propertyTypes.map(pt => (
                                <div key={pt.value}>
                                   <RadioGroupItem value={pt.value} id={pt.value} className="peer sr-only"/>
                                   <Label htmlFor={pt.value} className={cn(
                                     "flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 h-24 text-center text-base font-medium",
                                     "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                     "peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-md peer-data-[state=checked]:bg-primary/5"
                                   )}>
                                     {pt.label}
                                   </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                )}
                {step === 2 && (
                    <div>
                        <h2 className="text-xl font-semibold mb-6">{tQuiz.cleaning_goal_title}</h2>
                         <RadioGroup 
                            value={answers.cleaningGoal} 
                            onValueChange={(value) => handleValueChange('cleaningGoal', value)}
                            className="flex flex-col gap-3"
                        >
                            {cleaningGoals.map(goal => (
                                <Label key={goal.value} htmlFor={goal.value} className={cn(
                                    "flex items-center rounded-lg border-2 border-muted p-4 gap-4",
                                    "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                    answers.cleaningGoal === goal.value && "border-primary shadow-md bg-primary/5"
                                )}>
                                   <RadioGroupItem value={goal.value} id={goal.value} />
                                   <span className="font-medium text-base">{goal.label}</span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </div>
                )}
                 {step === 3 && (
                    <div className="flex flex-col items-center justify-center h-full pt-8">
                        <h2 className="text-xl font-semibold mb-6">{tQuiz.area_title}</h2>
                        <div className="w-full max-w-sm text-center">
                            <p className="font-bold text-5xl text-primary mb-4">{answers.area} м²</p>
                            <Slider
                                min={10}
                                max={2000}
                                step={10}
                                value={[answers.area]}
                                onValueChange={(value) => handleValueChange('area', value[0])}
                             />
                             <p className="text-xs text-muted-foreground mt-2">{tQuiz.area_slider_hint}</p>
                        </div>
                    </div>
                )}
                {step === 4 && recommendedService && (
                    <div className="text-center">
                        <Check className="w-16 h-16 text-green-500 bg-green-100 rounded-full p-3 mx-auto mb-6"/>
                        <h2 className="text-2xl font-bold font-headline mb-2">{tQuiz.result_title.replace('{service}', recommendedService.title)}</h2>
                        <p className="text-muted-foreground max-w-lg mx-auto mb-6">{recommendedService.description}</p>
                         <Card className="text-left bg-secondary/70">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-3">
                                    <recommendedService.icon className="w-8 h-8 text-primary" />
                                    {recommendedService.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p>{tQuiz.result_description
                                    .replace('{propertyType}', getPropertyTypeGenitive(answers.propertyType))
                                    .replace('{area}', answers.area)
                                    .replace('{goal}', cleaningGoals.find(g => g.value === answers.cleaningGoal)?.label.toLowerCase() || '')
                                }</p>
                                <Button asChild variant="link" className="px-0 mt-2">
                                    <Link href={`/${locale}${recommendedService.slug}`}>{tQuiz.learn_more_button} <ArrowRight className="ml-2 h-4 w-4"/></Link>
                                </Button>
                            </CardContent>
                         </Card>
                    </div>
                )}
            </CardContent>

             <div className="p-6 bg-secondary/50 border-t flex items-center justify-between">
                {step > 1 && step < 4 ? (
                    <Button variant="ghost" onClick={prevStep}>
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        {tQuiz.back_button}
                    </Button>
                ) : <div />}

                {step < 3 && (
                    <Button onClick={nextStep} disabled={isNextDisabled}>
                        {tQuiz.next_button}
                        <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                )}
                {step === 3 && (
                    <Button onClick={nextStep}>
                        {tQuiz.show_result_button}
                        <Check className="ml-2 h-4 w-4"/>
                    </Button>
                )}
                 {step === 4 && (
                     <Button variant="ghost" onClick={startOver}>
                        <RefreshCw className="mr-2 h-4 w-4"/>
                        {tQuiz.start_over_button}
                    </Button>
                 )}
            </div>
        </Card>
        
        {step === 4 && recommendedService && (
             <div id="cta-quiz" className="w-full mt-12 py-12 px-6 bg-secondary/70 rounded-xl text-center">
                  <div className="space-y-3">
                      <h2 className="text-2xl font-bold tracking-tighter md:text-3xl font-headline">
                          {tQuiz.cta_title.replace('{service}', recommendedService.title)}
                      </h2>
                      <p className="mx-auto max-w-[600px] text-muted-foreground md:text-lg">
                         {tQuiz.cta_subtitle}
                      </p>
                  </div>
                  <div className="mx-auto w-full max-w-md mt-6">
                      <ContactForm defaultService={recommendedService.title} />
                  </div>
              </div>
        )}
       </div>
    </div>
  );
}
