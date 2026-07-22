# FinanceDesk 💼

Selamlar,

FinanceDesk, küçük ve orta ölçekli işletmelerin günlük finans, ön muhasebe, cari hesap, kredi kartı ve nakit akışı takibini yapabilmesi için geliştirdiğim bir platform. Eskiden her şeyi Excel'de tutmaktan sıkıldığım için böyle bir çözüm geliştirdim.

## 🚀 Özellikler

* **Cari Yönetimi:** Müşteri/tedarikçi borç alacak takibi, tek tıkla mutabakat.
* **Akıllı Ekstre Okuma:** PDF, Excel, resim veya CSV formatındaki banka ve kart ekstrelerini sisteme atıyorsunuz, kendi kendine okuyup içeri aktarıyor.
* **Çek ve Senetler:** Portföydeki çekleri/senetleri takip etme, kırdırma ve ciro etme işlemleri. Kırdırınca masrafı otomatik düşüyor.
* **Kredi Kartı Takvimi:** Tüm kartların kesim ve son ödeme tarihlerini aylık takvim üzerinden takip edebilirsiniz.
* **Personel Takibi:** Maaş ve avans işlemleri.

## 🛠️ Nasıl Çalıştırılır?

Projeyi Next.js 16 (App Router) ile geliştirdim. Veritabanı olarak Supabase kullanıyorum.

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env.local` dosyası oluşturup bilgileri girin:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
```

3. Uygulamayı ayağa kaldırın:
```bash
npm run dev
```

---

## 📜 Lisans & Kullanım Hakları

Bu projenin tüm hakları bana (Selim Albayrak) aittir. İzinsiz kopyalanamaz ve paylaşılamaz. Kendi kullanımınız veya test için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.
