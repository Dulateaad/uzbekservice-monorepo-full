
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { submitInquiry } from "@/lib/actions";
import { useDictionary } from "@/contexts/dictionary-context";
import * as constants from "@/lib/constants";
import { useParams } from "next/navigation";

const formSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  service: z.string().optional(),
});

type ContactFormValues = z.infer<typeof formSchema>;

export function ContactForm({ defaultService, noRedirect, onSuccess }: { defaultService?: string; noRedirect?: boolean; onSuccess?: () => void }) {
  const t = useDictionary();
  const params = useParams();
  const locale = params.locale as string || 'ru';
  const services = constants.getServices(t);
  
  const dynamicFormSchema = z.object({
    name: z.string().min(2, { message: t.ContactForm.name_error }),
    phone: z.string().min(7, { message: t.ContactForm.phone_error }),
    service: z.string().optional(),
  });

  const { toast } = useToast();
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(dynamicFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      service: defaultService || "",
    },
  });

  async function handleAction(formData: FormData) {
      try {
          if (noRedirect) formData.set('noRedirect', 'true');
          const result = await submitInquiry(formData);
          if (
            result &&
            'success' in result &&
            result.success === false &&
            result.code === 'RATE_LIMIT'
          ) {
            toast({
              variant: 'destructive',
              title: t.ContactForm.rate_limit_toast_title,
              description: t.ContactForm.rate_limit_toast_description,
            });
            return;
          }
          if (result && 'success' in result && result.success && onSuccess) onSuccess();
      } catch (e) {
          if (e instanceof Error && e.message.includes('NEXT_REDIRECT')) {
              throw e;
          }
          toast({
            variant: "destructive",
            title: t.ContactForm.error_toast_title,
            description: t.ContactForm.error_toast_description,
          });
      }
  }

  if (form.formState.isSubmitting) {
    return (
      <div className="flex justify-center items-center min-h-[260px]">
        <dotlottie-wc 
            src="https://lottie.host/e77a7057-00fa-4005-87a6-9e4cf5d9f4c1/JoYgNJl1b6.lottie" 
            style={{ width: '250px', height: '250px' }} 
            autoplay 
            loop>
        </dotlottie-wc>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form action={handleAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">{t.ContactForm.name_placeholder}</FormLabel>
              <FormControl>
                <Input placeholder={t.ContactForm.name_placeholder} name="name" required {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">{t.ContactForm.phone_placeholder}</FormLabel>
              <FormControl>
                <Input placeholder={t.ContactForm.phone_placeholder} type="tel" name="phone" required {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="service"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">{t.ContactForm.service_placeholder}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} name="service">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t.ContactForm.service_placeholder} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {services.map((service: any) => (
                    <SelectItem key={service.slug} value={service.title}>
                      {service.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg" className="w-full">
          {t.ContactForm.submit_button}
        </Button>
      </form>
    </Form>
  );
}
