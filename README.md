# FinanceDesk 💼

FinanceDesk, küçük ve orta ölçekli işletmelerin ön muhasebe, cari hesap, kasa/banka nakit akışı, çek/senet, kredi kartı ve personel takibini tek bir panelden kolayca yönetebilmesi için geliştirdiğim modern bir finansal yönetim platformudur.

## 🚀 Öne Çıkan Özellikler

* **Cari Hesap Yönetimi:** Müşteri ve tedarikçilerin borç/alacak bakiyelerini anlık takip etme, detaylı ekstre dökümü ve tek tıkla Mutabakat Mektubu yazdırma.
* **Yapay Zeka Destekli Ekstre Okuma (AI):** Banka, cari ve kredi kartı ekstrelerini (PDF, Excel, CSV, Resim) Gemini AI altyapısıyla otomatik analiz edip sisteme aktarma.
* **Çek ve Senet Portföyü:** Alınan/verilen çek ve senetlerin takibi, vadeli kırdırma (erken tahsilat), ciro etme (devretme) ve tahsilat işlemleri.
* **Kredi Kartları & Ödeme Takvimi:** Şahsi ve şirket kredi kartı borçları, asgari ödeme oranları ve son ödeme günlerini gösteren kronolojik ödeme takvimi.
* **Kasa & Banka Nakit Akışı:** Nakit, banka ve POS kasalarının yönetimi, kasalar arası transfer ve anlık gelir/gider hareketleri.
* **Personel & Maaş Takibi:** Çalışan maaş, avans ve mesai takibi, maaş bordrosu çıktısı ve toplu imza föyü alma.
* **Düzenli & Fabrika Giderleri:** Kira, fatura vb. aylık tekrarlayan giderlerin takvime bağlanıp otomatik hatırlatılması.

## 🛠️ Teknolojiler

* **Frontend & Backend:** Next.js 16 (App Router), TypeScript, React 19
* **Tasarım:** Tailwind CSS v4, shadcn/ui, Lucide Icons
* **Veritabanı & Auth:** Supabase (PostgreSQL, Row Level Security)
* **Yapay Zeka:** Google Gemini 2.0 Flash API

## 💻 Yerel Geliştirme (Local Setup)

1. Projeyi klonlayın ve bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env.local` dosyasını oluşturun ve gerekli değişkenleri tanımlayın:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

3. Geliştirici sunucusunu başlatın:
```bash
npm run dev
```

---

## 📜 Lisans & Kullanım Hakları

Bu yazılımın tüm telif ve mülkiyet hakları **Selim Albayrak**'a aittir. Detaylar için [LICENSE](LICENSE) belgesine göz atabilirsiniz.
