
'use client';

import { useEffect, useState, useMemo, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, ShoppingCart, Users, PlusCircle, List, Loader2, Trash2, Edit, X, Upload, FileUp, FileText } from 'lucide-react';
import Link from 'next/link';
import { FirebaseClientProvider, useFirebase, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table"
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { uploadProductImage, runBatchAddProducts } from "../actions";
import type { Product, UserProfile } from "@/lib/types";
import Papa from 'papaparse';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';


type EditableProduct = (Product & { id: string });

const productSchema = z.object({
  name: z.string().min(3, "Название должно быть не менее 3 символов."),
  description: z.string().min(10, "Описание должно быть не менее 10 символов."),
  price: z.preprocess(
    (a) => parseFloat(z.string().parse(a)),
    z.number().positive("Цена должна быть положительным числом.")
  ),
  imageUrls: z.array(z.string().url("Неверный формат URL.")).min(1, "Добавьте хотя бы одно изображение."),
  category: z.string().min(2, "Категория должна быть не менее 2 символов."),
  sizes: z.array(z.string()).min(1, "Добавьте хотя бы один размер."),
  ownerId: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const batchUploadSchema = z.object({
  file: z.instanceof(File).optional(),
  text: z.string().optional(),
});
type BatchUploadFormValues = z.infer<typeof batchUploadSchema>;


function ProductForm({
  product,
  onFormSubmit,
  onClose,
}: {
  product: EditableProduct | null;
  onFormSubmit: () => void;
  onClose: () => void;
}) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sizeInput, setSizeInput] = useState("");
  const imageUploadRef = useRef<HTMLInputElement>(null);

  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, "products") : null),
    [firestore]
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      ...product,
      imageUrls: product.imageUrls || [],
    } : {
      name: "",
      description: "",
      price: 0,
      imageUrls: [],
      category: "",
      sizes: [],
    },
  });
  
  useEffect(() => {
    form.reset(product ? {
        ...product,
        imageUrls: product.imageUrls || [],
        sizes: product.sizes || [],
      } : {
        name: "",
        description: "",
        price: 0,
        imageUrls: [],
        category: "",
        sizes: [],
      });
  }, [product, form]);

  const handleAddSize = () => {
    if (sizeInput.trim()) {
        const currentSizes = form.getValues("sizes") || [];
        form.setValue("sizes", [...currentSizes, sizeInput.trim().toUpperCase()]);
        setSizeInput("");
    }
  };

  const handleRemoveSize = (sizeToRemove: string) => {
    const currentSizes = form.getValues("sizes");
    form.setValue("sizes", currentSizes.filter(s => s !== sizeToRemove));
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({ title: "Загрузка изображения..." });

    try {
        const formData = new FormData();
        formData.append('file', file);
        const result = await uploadProductImage(formData);

        if (result.error || !result.url) {
            throw new Error(result.error || "Не удалось загрузить изображение.");
        }

        const currentImageUrls = form.getValues("imageUrls") || [];
        form.setValue("imageUrls", [...currentImageUrls, result.url]);
        toast({ title: "Изображение загружено!" });

    } catch (error: any) {
        toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive"});
    } finally {
        setIsUploading(false);
        if(imageUploadRef.current) imageUploadRef.current.value = "";
    }
  };

  const handleRemoveImageUrl = (urlToRemove: string) => {
    const currentImageUrls = form.getValues("imageUrls");
    form.setValue("imageUrls", currentImageUrls.filter(url => url !== urlToRemove));
  };


  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    if (!firestore || !productsCollection || !user) return;
    setIsSubmitting(true);

    const productData = { ...data, colors: [], ownerId: user.uid };

    try {
      if (product) {
        const productDoc = doc(firestore, "products", product.id);
        await updateDoc(productDoc, productData);
        toast({ title: "Товар обновлен" });
      } else {
        await addDoc(productsCollection, productData);
        toast({ title: "Товар добавлен" });
      }
      onFormSubmit();
    } catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: product ? `products/${product.id}` : "products",
            operation: product ? 'update' : 'create',
            requestResourceData: productData,
        }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название товара</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание</FormLabel>
              <FormControl><Textarea {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Цена (₸)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Категория</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <FormField
            control={form.control}
            name="imageUrls"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Изображения</FormLabel>
                <FormControl>
                    <div>
                        <input
                            type="file"
                            className="hidden"
                            ref={imageUploadRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            disabled={isUploading}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => imageUploadRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
                            Загрузить
                        </Button>
                    </div>
                </FormControl>
                <div className="flex flex-wrap gap-2 mt-2">
                    {field.value?.map((url, index) => (
                        <div key={index} className="relative group">
                            <Image src={url} alt="Product" width={60} height={75} className="rounded-md object-cover" />
                             <button type="button" onClick={() => handleRemoveImageUrl(url)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="sizes"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Размеры</FormLabel>
                <div className="flex gap-2">
                    <Input value={sizeInput} onChange={(e) => setSizeInput(e.target.value)} />
                    <Button type="button" onClick={handleAddSize}>+</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {field.value?.map(size => (
                        <Badge key={size} variant="secondary" className="flex items-center gap-1">
                            {size}
                            <button type="button" onClick={() => handleRemoveSize(size)}><X className="h-3 w-3" /></button>
                        </Badge>
                    ))}
                </div>
            </FormItem>
            )}
        />

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {product ? "Сохранить" : "Добавить"}
            </Button>
        </div>
      </form>
    </Form>
  );
}

function BatchUploadDialog({ onFormSubmit, onClose }: { onFormSubmit: () => void; onClose: () => void; }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const form = useForm<BatchUploadFormValues>({
        resolver: zodResolver(batchUploadSchema),
    });

    const file = form.watch('file');
    const text = form.watch('text');
    
    const handleParseAndProcess = (data: any) => {
        if (!firestore || !user) return;
        
        const content = typeof data === 'string' ? data : data.toString();
        
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const aiResult = await runBatchAddProducts({ products: results.data as any[] });
                    
                    if (aiResult.error || !aiResult.processedProducts) {
                        throw new Error(aiResult.error || "Ошибка обработки.");
                    }

                    const batch = writeBatch(firestore);
                    const productsCollection = collection(firestore, "products");

                    aiResult.processedProducts.forEach(productData => {
                        const newDocRef = doc(productsCollection);
                        batch.set(newDocRef, { ...productData, ownerId: user.uid });
                    });

                    await batch.commit();
                    toast({ title: "Импорт завершен!" });
                    onFormSubmit();

                } catch (error: any) {
                    toast({ title: "Ошибка импорта", description: error.message, variant: "destructive" });
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    }

    const handleBatchSubmit = async (values: BatchUploadFormValues) => {
        setIsProcessing(true);
        if (values.file) {
            const reader = new FileReader();
            reader.onload = (e) => handleParseAndProcess(e.target?.result);
            reader.readAsText(values.file);
        } else if (values.text) {
            handleParseAndProcess(values.text);
        }
    };

    return (
        <DialogContent className="sm:max-w-xl">
             <DialogHeader>
                <DialogTitle>Массовый импорт</DialogTitle>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleBatchSubmit)} className="space-y-4">
                    <Tabs defaultValue="file">
                        <TabsList className='grid grid-cols-2'>
                            <TabsTrigger value="file">Файл CSV</TabsTrigger>
                            <TabsTrigger value="text">Текст</TabsTrigger>
                        </TabsList>
                        <TabsContent value="file" className='pt-2'>
                            <FormField control={form.control} name="file" render={({ field }) => (
                                <FormItem>
                                    <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => field.onChange(e.target.files?.[0])} accept=".csv" />
                                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className='w-full'>
                                        {file ? file.name : 'Выбрать CSV'}
                                    </Button>
                                </FormItem>
                            )} />
                        </TabsContent>
                        <TabsContent value="text" className='pt-2'>
                             <FormField control={form.control} name="text" render={({ field }) => (
                                <FormItem><Textarea placeholder="name,price,sizes,imageUrls..." {...field} /></FormItem>
                            )} />
                        </TabsContent>
                    </Tabs>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
                        <Button type="submit" disabled={isProcessing}>{isProcessing ? <Loader2 className="animate-spin" /> : "Импорт"}</Button>
                    </div>
                </form>
            </Form>
        </DialogContent>
    );
}

function ProductCatalog() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);

  const productsQuery = useMemoFirebase(
    () => {
      if (!firestore || !user) return null;
      return query(collection(firestore, "products"), where("ownerId", "==", user.uid));
    },
    [firestore, user]
  );

  const { data: products, isLoading } = useCollection<EditableProduct>(productsQuery);

  const handleDelete = async (productId: string) => {
    if (!firestore) return;
    const productDoc = doc(firestore, "products", productId);
    try {
        await deleteDoc(productDoc);
        toast({ title: "Товар удален", variant: "destructive" });
    } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: productDoc.path, operation: 'delete' }));
    }
  };

  return (
    <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Каталог товаров</CardTitle>
                </div>
                <div className='flex gap-2'>
                    <Button onClick={() => setIsBatchFormOpen(true)} variant="outline"><FileUp className="mr-2 h-4 w-4"/>Импорт</Button>
                    <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4"/>Добавить</Button>
                </div>
            </CardHeader>
            <CardContent>
             {isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : (
                <Table>
                    <TableHeader><TableRow><TableHead>Фото</TableHead><TableHead>Название</TableHead><TableHead className="text-right">Цена</TableHead><TableHead className="text-center">Действия</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {products?.map((product) => (
                            <TableRow key={product.id}>
                                <TableCell><Image src={product.imageUrls?.[0] || "https://placehold.co/50x62"} alt="" width={50} height={62} className="rounded object-cover" /></TableCell>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-right">₸{product.price}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex gap-2 justify-center">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingProduct(product); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-600" /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Удалить?</AlertDialogTitle></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Нет</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(product.id)}>Да</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             )}
            </CardContent>
        </Card>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}><ProductForm product={editingProduct} onFormSubmit={() => setIsFormOpen(false)} onClose={() => setIsFormOpen(false)} /></Dialog>
        <Dialog open={isBatchFormOpen} onOpenChange={setIsBatchFormOpen}><BatchUploadDialog onFormSubmit={() => setIsBatchFormOpen(false)} onClose={() => setIsBatchFormOpen(false)} /></Dialog>
    </>
  );
}

function AnalyticsDashboard() {
  const { firestore, user } = useFirebase();
  const { data: users } = useCollection<UserProfile>(useMemoFirebase(() => firestore ? collection(firestore, 'userProfiles') : null, [firestore]));
  const { data: products } = useCollection<Product>(useMemoFirebase(() => firestore && user ? query(collection(firestore, "products"), where("ownerId", "==", user.uid)) : null, [firestore, user]));

  const statCards = [
    { title: 'Товаров', value: products?.length || 0, icon: List },
    { title: 'Пользователей', value: users?.length || 0, icon: Users },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stat.value}</div></CardContent>
        </Card>
      ))}
    </div>
  );
}

function DashboardInner() {
    const { user, isUserLoading } = useFirebase();
    const router = useRouter();
    
    useEffect(() => { 
        if (!isUserLoading && !user) router.replace('/login'); 
    }, [user, isUserLoading, router]);

    if (isUserLoading || !user) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    return (
        <div className="container py-8 space-y-8">
            <h1 className="text-3xl font-bold font-headline">Панель партнера</h1>
            <AnalyticsDashboard />
            <ProductCatalog />
        </div>
    );
}

export default function DashboardPage() {
    return (
        <FirebaseClientProvider>
            <DashboardInner />
        </FirebaseClientProvider>
    )
}
