import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Package, FileText, Download, Plus, UserCheck, Loader2, Truck, X, Pencil, Trash2, Save, Printer } from 'lucide-react';
import { format } from 'date-fns';

const CITIES = [
  // Major cities
  'Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Taif', 'Tabuk', 'Buraidah', 'Khamis Mushait', 'Abha',
  'Hail', 'Najran', 'Jizan', 'Al Khobar', 'Jubail', 'Yanbu', 'Al Ahsa', 'Hafar Al Batin', 'Arar', 'Sakaka',
  // Mid-size cities
  'Al Qatif', 'Al Kharj', 'Unaizah', 'Ar Rass', 'Al Baha', 'Bisha', 'Al Majmaah', 'Dhahran', 'Ras Tanura',
  'Al Qunfudhah', 'Wadi Al Dawasir', 'Dawadmi', 'Afif', 'Shaqra', 'Al Zulfi', 'Al Ghat', 'Thadiq',
  'Hotat Bani Tamim', 'Al Muzahmiyya', 'Rumah', 'Al Hariq', 'Layla', 'Al Aflaj',
  // Northern region
  'Turaif', 'Rafha', 'Al Qurayyat', 'Domat Al Jandal', 'Tayma', 'Al Ula', 'Al Wajh', 'Duba', 'Haql',
  'Umluj', 'Khaybar',
  // Eastern region
  'Al Hofuf', 'Al Mubarraz', 'Qatif', 'Saihat', 'Tarout', 'Al Awamiyah', 'Abqaiq', 'Khafji',
  'Al Nairyah', 'Qaryat Al Ulya', 'Haradh', 'Al Uyun',
  // Western region
  'Rabigh', 'Al Lith', 'Badr', 'Khulais', 'Al Kamil', 'Thuwal', 'Mastorah',
  // Southern region
  'Al Namas', 'Sarat Abidah', 'Tanomah', 'Rijal Almaa', 'Al Makhwah', 'Baljurashi', 'Al Aqiq',
  'Muhayil', 'Bariq', 'Al Darb', 'Abu Arish', 'Sabya', 'Samtah', 'Al Aydabi', 'Ahad Al Masarihah',
  'Baish', 'Farasan', 'Al Harjah', 'Sharorah', 'Habuna', 'Yadamah', 'Thar',
  // Central region small cities
  'Al Quway\'iyah', 'Marat', 'Al Bukayriyah', 'Al Badayea', 'Riyadh Al Khabra', 'Al Asyah',
  'Al Mithnab', 'Al Shinan', 'Dhruma', 'Huraymila', 'Diriyah', 'Al Muzahimiyah',
  // Other small cities & towns
  'Turbah', 'Ranyah', 'Al Muwayh', 'Zahran Al Janub', 'Al Majardah', 'Balqarn',
  'Tathleeth', 'Al Amaq', 'Khaibar Al Janub', 'Sabt Al Alaya',
].sort();

interface ShipmentRecord {
  awb: string;
  name: string;
  city: string;
  cod: number;
  date: string;
}

interface SavedCustomer {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
}

export default function Shipping() {
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pieces, setPieces] = useState('1');
  const [weight, setWeight] = useState('0.5');
  const [codAmount, setCodAmount] = useState('0');
  const [multipleMode, setMultipleMode] = useState(false);
  const [awbCount, setAwbCount] = useState('2');

  // UI state
  const [creating, setCreating] = useState(false);
  const [creatingProgress, setCreatingProgress] = useState('');
  const [lastAwb, setLastAwb] = useState<string | null>(null);
  const [lastAwbs, setLastAwbs] = useState<string[]>([]);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfAwb, setPdfAwb] = useState<string | null>(null);
  const [multiPdfData, setMultiPdfData] = useState<string[]>([]);
  const [multiPdfLoading, setMultiPdfLoading] = useState(false);
  const [history, setHistory] = useState<ShipmentRecord[]>([]);

  // Saved customers
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await (supabase as any)
      .from('shipping_customers')
      .select('*')
      .order('name');
    if (data) setSavedCustomers(data as SavedCustomer[]);
  };

  const selectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const c = savedCustomers.find(c => c.id === customerId);
    if (c) {
      setName(c.name);
      setPhone(c.phone);
      setCity(c.city);
      setAddress(c.address);
    }
  };

  const saveCustomer = async () => {
    if (!name || !phone || !city || !address) {
      toast({ title: 'Fill all customer fields first', variant: 'destructive' });
      return;
    }
    const { error } = await (supabase as any).from('shipping_customers').insert({
      name, phone, city, address,
    });
    if (error) {
      toast({ title: 'Failed to save customer', variant: 'destructive' });
    } else {
      toast({ title: 'Customer saved!' });
      fetchCustomers();
    }
  };

  const updateCustomer = async () => {
    if (!editingCustomerId || !name || !phone || !city || !address) {
      toast({ title: 'Fill all customer fields first', variant: 'destructive' });
      return;
    }
    const { error } = await (supabase as any).from('shipping_customers')
      .update({ name, phone, city, address })
      .eq('id', editingCustomerId);
    if (error) {
      toast({ title: 'Failed to update customer', variant: 'destructive' });
    } else {
      toast({ title: 'Customer updated!' });
      setEditingCustomerId(null);
      fetchCustomers();
    }
  };

  const deleteCustomer = async (customerId: string) => {
    const { error } = await (supabase as any).from('shipping_customers')
      .delete()
      .eq('id', customerId);
    if (error) {
      toast({ title: 'Failed to delete customer', variant: 'destructive' });
    } else {
      toast({ title: 'Customer deleted' });
      if (selectedCustomerId === customerId) clearForm();
      fetchCustomers();
    }
  };

  const startEditCustomer = () => {
    if (!selectedCustomerId) return;
    setEditingCustomerId(selectedCustomerId);
  };

  const clearForm = () => {
    setSelectedCustomerId('');
    setName('');
    setPhone('');
    setCity('');
    setAddress('');
    setPieces('1');
    setWeight('0.5');
    setCodAmount('0');
    setLastAwb(null);
    setLastAwbs([]);
    setMultiPdfData([]);
  };

  // Recursively search for AWB number in any nested response structure
  const extractAwb = (obj: any): string | null => {
    if (!obj || typeof obj !== 'object') return null;
    const awbKeys = ['awbNo', 'awb', 'AWBNo', 'tracking', 'sawb', 'shipmentNo'];
    for (const key of awbKeys) {
      if (obj[key] && typeof obj[key] === 'string') return obj[key];
      if (obj[key] && typeof obj[key] === 'number') return String(obj[key]);
    }
    // Search nested objects (e.g. data.data.awbNo)
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const found = extractAwb(obj[key]);
        if (found) return found;
      }
    }
    return null;
  };

  const createSingleShipment = async (): Promise<string | null> => {
    const res = await fetch('https://n8n.srv1149238.hstgr.cloud/webhook/smsa-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cName: name,
        cMobile: phone,
        cCity: city,
        cAddr1: address,
        PCs: pieces,
        weight,
        codAmt: codAmount,
      }),
    });
    const data = await res.json();
    console.log('SMSA create response:', JSON.stringify(data));
    const awb = extractAwb(data);
    if (awb) return awb;
    // If response is just a string/number itself
    if (typeof data === 'string' && data.length > 3) return data;
    if (typeof data === 'number') return String(data);
    throw new Error(`Could not find AWB in response: ${JSON.stringify(data).slice(0, 200)}`);
  };

  const createShipment = async () => {
    if (!name || !phone || !city || !address) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setCreating(true);
    setLastAwbs([]);
    setMultiPdfData([]);

    const count = multipleMode ? Math.max(1, parseInt(awbCount) || 1) : 1;

    try {
      const awbs: string[] = [];
      for (let i = 0; i < count; i++) {
        setCreatingProgress(`Creating shipment ${i + 1} of ${count}...`);
        const awb = await createSingleShipment();
        if (awb) {
          awbs.push(awb);
          setHistory(prev => [{
            awb,
            name,
            city,
            cod: parseFloat(codAmount) || 0,
            date: format(new Date(), 'yyyy-MM-dd HH:mm'),
          }, ...prev]);
        }
      }

      // Auto-fetch PDFs right after creation
      if (awbs.length === 1) {
        setLastAwb(awbs[0]);
        toast({ title: `Shipment created! AWB: ${awbs[0]}. Fetching label...` });
        setCreatingProgress('Fetching PDF label...');
        try {
          const res = await fetch('https://n8n.srv1149238.hstgr.cloud/webhook/smsa-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ awbNo: awbs[0] }),
          });
          const data = await res.json();
          const base64 = data?.pdf || data?.data || data?.base64 || (typeof data === 'string' ? data : '');
          if (base64) {
            setPdfData(base64);
            setPdfAwb(awbs[0]);
            toast({ title: 'Label ready!' });
          } else {
            toast({ title: 'AWB created but PDF not available', description: 'Try fetching it manually', variant: 'destructive' });
          }
        } catch {
          toast({ title: 'AWB created but failed to fetch PDF', variant: 'destructive' });
        }
      } else if (awbs.length > 1) {
        setLastAwbs(awbs);
        setLastAwb(null);
        toast({ title: `${awbs.length} shipments created! Fetching labels...` });
        setCreatingProgress('Fetching PDF labels...');
        const pdfs: string[] = [];
        for (const awbNo of awbs) {
          try {
            const res = await fetch('https://n8n.srv1149238.hstgr.cloud/webhook/smsa-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ awbNo }),
            });
            const data = await res.json();
            const base64 = data?.pdf || data?.data || data?.base64 || (typeof data === 'string' ? data : '');
            if (base64) pdfs.push(base64);
          } catch {}
        }
        if (pdfs.length > 0) {
          setMultiPdfData(pdfs);
          toast({ title: `${pdfs.length} labels ready!` });
        } else {
          toast({ title: 'AWBs created but PDFs not available', variant: 'destructive' });
        }
      }
    } catch (err: any) {
      toast({ title: 'Failed to create shipment', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
      setCreatingProgress('');
    }
  };

  const getAllPdfs = async (awbs: string[]) => {
    setMultiPdfLoading(true);
    setMultiPdfData([]);
    const pdfs: string[] = [];
    try {
      for (const awbNo of awbs) {
        const res = await fetch('https://n8n.srv1149238.hstgr.cloud/webhook/smsa-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ awbNo }),
        });
        const data = await res.json();
        const base64 = data?.pdf || data?.data || data?.base64 || (typeof data === 'string' ? data : '');
        if (base64) pdfs.push(base64);
      }
      if (pdfs.length === 0) {
        toast({ title: 'No PDF data received', variant: 'destructive' });
        return;
      }
      setMultiPdfData(pdfs);
      toast({ title: `${pdfs.length} labels loaded!` });
    } catch (err: any) {
      toast({ title: 'Failed to get PDFs', description: err.message, variant: 'destructive' });
    } finally {
      setMultiPdfLoading(false);
    }
  };

  const getPdf = async (awbNo: string) => {
    setPdfLoading(awbNo);
    try {
      const res = await fetch('https://n8n.srv1149238.hstgr.cloud/webhook/smsa-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awbNo }),
      });
      const data = await res.json();
      const base64 = data?.pdf || data?.data || data?.base64 || (typeof data === 'string' ? data : '');
      if (!base64) {
        toast({ title: 'No PDF data received', variant: 'destructive' });
        return;
      }
      setPdfData(base64);
      setPdfAwb(awbNo);
    } catch (err: any) {
      toast({ title: 'Failed to get PDF', description: err.message, variant: 'destructive' });
    } finally {
      setPdfLoading(null);
    }
  };

  const base64ToBlob = (base64: string, type = 'application/pdf') => {
    const binStr = atob(base64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
    return new Blob([arr], { type });
  };

  const downloadPdf = (base64?: string, awb?: string) => {
    const pdfBase64 = base64 || pdfData;
    const pdfName = awb || pdfAwb;
    if (!pdfBase64 || !pdfName) return;
    const blob = base64ToBlob(pdfBase64);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AWB-${pdfName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const openPdfInNewTab = (base64?: string) => {
    const pdfBase64 = base64 || pdfData;
    if (!pdfBase64) return;
    const blob = base64ToBlob(pdfBase64);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <AppLayout>
      <style>{`
        .smsa-page { --smsa-purple: 270 60% 40%; --smsa-orange: 25 95% 53%; --smsa-purple-light: 270 50% 95%; --smsa-orange-light: 30 90% 95%; }
        .dark .smsa-page { --smsa-purple-light: 270 40% 18%; --smsa-orange-light: 25 50% 15%; }
      `}</style>
      <div className="smsa-page p-4 lg:p-6 max-w-[1200px] mx-auto space-y-6">
        {/* Header with gradient */}
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, hsl(270 60% 40% / 0.1), hsl(25 95% 53% / 0.1))' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'hsl(270 60% 40%)' }}>
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Shipping Labels</h1>
            <p className="text-sm" style={{ color: 'hsl(270 60% 40%)' }}>SMSA Express shipment creator</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card className="border-t-4" style={{ borderTopColor: 'hsl(270 60% 40%)' }}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" style={{ color: 'hsl(270 60% 40%)' }} />
                Create Shipment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Saved customer selector */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Saved Customer</Label>
                  <Select value={selectedCustomerId} onValueChange={selectCustomer}>
                    <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
                    <SelectContent>
                      {savedCustomers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} — {c.city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editingCustomerId ? (
                  <Button variant="outline" size="icon" onClick={updateCustomer} title="Save changes" className="border-green-500 text-green-600 hover:bg-green-50">
                    <Save className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" onClick={saveCustomer} title="Save current as new customer" className="border-border hover:border-[hsl(270_60%_40%)] hover:text-[hsl(270_60%_40%)]">
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
                {selectedCustomerId && !editingCustomerId && (
                  <>
                    <Button variant="ghost" size="icon" onClick={startEditCustomer} title="Edit customer">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCustomer(selectedCustomerId)} title="Delete customer" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                {(selectedCustomerId || editingCustomerId) && (
                  <Button variant="ghost" size="icon" onClick={() => { clearForm(); setEditingCustomerId(null); }} title="Clear">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {editingCustomerId && (
                <p className="text-xs text-amber-600 font-medium">✏️ Editing customer — modify fields above then click save</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name *</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <Label>Customer Phone *</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XXXXXXXX" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>City *</Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>COD Amount (SAR)</Label>
                  <Input type="number" value={codAmount} onChange={e => setCodAmount(e.target.value)} min="0" step="0.01" />
                </div>
              </div>

              <div>
                <Label>Address *</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Full address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pieces</Label>
                  <Input type="number" value={pieces} onChange={e => setPieces(e.target.value)} min="1" />
                </div>
                <div>
                  <Label>Weight (KG)</Label>
                  <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} min="0.1" step="0.1" />
                </div>
              </div>

              {/* Multiple AWB toggle */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={multipleMode}
                      onChange={e => setMultipleMode(e.target.checked)}
                      className="rounded"
                    />
                    Multiple AWBs
                  </Label>
                  {multipleMode && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Count:</Label>
                      <Input
                        type="number"
                        value={awbCount}
                        onChange={e => setAwbCount(e.target.value)}
                        min="2"
                        max="20"
                        className="w-20 h-8 text-sm"
                      />
                    </div>
                  )}
                </div>
                {multipleMode && (
                  <p className="text-xs text-muted-foreground">Will create {parseInt(awbCount) || 2} shipments for the same customer</p>
                )}
              </div>

              <Button
                onClick={createShipment}
                disabled={creating}
                className="w-full text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, hsl(270 60% 40%), hsl(270 50% 50%))' }}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Package className="w-4 h-4 mr-2" />}
                {creating ? creatingProgress || 'Creating...' : multipleMode ? `Create ${parseInt(awbCount) || 2} Shipments` : 'Create Shipment'}
              </Button>

              {/* Single AWB result */}
              {lastAwb && (
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'hsl(25 95% 53% / 0.4)', backgroundColor: 'hsl(25 95% 53% / 0.06)' }}>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" style={{ color: 'hsl(25 95% 53%)' }} />
                    <span className="font-semibold text-foreground">AWB: {lastAwb}</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => getPdf(lastAwb)}
                    disabled={pdfLoading === lastAwb}
                    className="hover:text-white"
                    style={{ borderColor: 'hsl(25 95% 53%)', color: 'hsl(25 95% 53%)' }}
                  >
                    {pdfLoading === lastAwb ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                    Get PDF
                  </Button>
                </div>
              )}

              {/* Multiple AWBs result */}
              {lastAwbs.length > 0 && (
                <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'hsl(25 95% 53% / 0.4)', backgroundColor: 'hsl(25 95% 53% / 0.06)' }}>
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5" style={{ color: 'hsl(25 95% 53%)' }} />
                    <span className="font-semibold text-foreground">{lastAwbs.length} AWBs Created</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {lastAwbs.map(a => (
                      <span key={a} className="text-xs font-mono px-2 py-1 rounded bg-muted">{a}</span>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => getAllPdfs(lastAwbs)}
                    disabled={multiPdfLoading}
                    className="hover:text-white"
                    style={{ borderColor: 'hsl(25 95% 53%)', color: 'hsl(25 95% 53%)' }}
                  >
                    {multiPdfLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                    Get All {lastAwbs.length} PDFs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PDF Viewer */}
          <Card className="min-h-[400px] border-t-4" style={{ borderTopColor: 'hsl(25 95% 53%)' }}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" style={{ color: 'hsl(25 95% 53%)' }} />
                  Label Preview {multiPdfData.length > 1 && `(${multiPdfData.length} labels)`}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {multiPdfData.length > 1 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (!printWindow) {
                          toast({ title: 'Pop-up blocked', description: 'Please allow pop-ups to print labels.', variant: 'destructive' });
                          return;
                        }
                        const iframes = multiPdfData.map((pdf, i) => 
                          `<div style="page-break-after: always;">
                            <h3 style="margin:0 0 8px;font-family:sans-serif;font-size:14px;">Label ${i + 1}${lastAwbs[i] ? ` — AWB: ${lastAwbs[i]}` : ''}</h3>
                            <iframe src="data:application/pdf;base64,${pdf}" style="width:100%;height:95vh;border:none;" onload="this.style.visibility='visible'"></iframe>
                          </div>`
                        ).join('');
                        printWindow.document.write(`<html><head><title>Print All Labels</title></head><body style="margin:0;">${iframes}<script>setTimeout(()=>window.print(),1000)<\/script></body></html>`);
                        printWindow.document.close();
                      }}
                      className="text-white"
                      style={{ background: 'hsl(270 60% 40%)' }}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print All
                    </Button>
                  )}
                  {pdfData && !multiPdfData.length && (
                    <Button
                      size="sm"
                      onClick={() => downloadPdf()}
                      className="text-white"
                      style={{ background: 'hsl(25 95% 53%)' }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      AWB-{pdfAwb}.pdf
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {multiPdfData.length > 0 ? (
                multiPdfData.map((pdf, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Label {i + 1}{lastAwbs[i] ? ` — AWB: ${lastAwbs[i]}` : ''}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPdf(pdf, lastAwbs[i] || String(i + 1))}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPdfInNewTab(pdf)}
                        className="text-xs"
                      >
                        Open
                      </Button>
                    </div>
                    <iframe
                      src={`data:application/pdf;base64,${pdf}`}
                      className="w-full h-[500px] rounded-lg border border-border hidden sm:block"
                      title={`Shipping Label ${i + 1}`}
                    />
                    <div className="sm:hidden text-center py-8 border border-border rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground mb-3">PDF preview not available on mobile</p>
                      <Button onClick={() => downloadPdf(pdf, lastAwbs[i] || String(i + 1))} className="text-white" style={{ background: 'hsl(25 95% 53%)' }}>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                ))
              ) : pdfData ? (
                <>
                  <iframe
                    src={`data:application/pdf;base64,${pdfData}`}
                    className="w-full h-[500px] rounded-lg border border-border hidden sm:block"
                    title="Shipping Label PDF"
                  />
                  <div className="sm:hidden text-center py-8 border border-border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-3">PDF preview not available on mobile</p>
                    <div className="flex flex-col gap-2 items-center">
                      <Button onClick={() => downloadPdf()} className="text-white" style={{ background: 'hsl(25 95% 53%)' }}>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button variant="outline" onClick={() => openPdfInNewTab()}>
                        Open in Browser
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Truck className="w-16 h-16 mb-3 opacity-20" style={{ color: 'hsl(270 60% 40%)' }} />
                  <p className="text-center">Create a shipment and click "Get PDF" to preview the label</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(270 60% 40%)' }} />
                Session History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>AWB</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>COD</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono font-medium" style={{ color: 'hsl(270 60% 40%)' }}>{h.awb}</TableCell>
                      <TableCell>{h.name}</TableCell>
                      <TableCell>{h.city}</TableCell>
                      <TableCell>{h.cod > 0 ? `${h.cod} SAR` : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{h.date}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => getPdf(h.awb)}
                          disabled={pdfLoading === h.awb}
                          style={{ color: 'hsl(25 95% 53%)' }}
                        >
                          {pdfLoading === h.awb ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
