# Geleneksel Muhasebe Terimlerinden Basit Takip Sistemine Geçiş Planı

Mevcut sistemdeki "Borç, Alacak, Verecek" gibi kafa karıştırıcı çift taraflı muhasebe (double-entry) mantığını tamamen kaldırıp, sizin talebiniz doğrultusunda **nakit akışı ve bakiye odaklı (Gönderilen/Alınan)** çok daha basit bir sisteme geçiyoruz.

Yapay zeka (PDF) okuma işlemini de altyapımız tamamen oturduğunda (ve Vercel sorunları tamamen çözüldüğünde) son aşama olarak sisteme geri entegre edeceğiz.

## ⚠️ Kullanıcı Onayı Gereken Değişiklikler (Lütfen İnceleyin)
Aşağıdaki mantık sizin çalışma şeklinize tam uyuyor mu?

Her Cari (Kişi/Firma) için tek bir **Bakiye (Balance)** tutulacak:
- Eğer bakiye **artı (+)** ise: Bu kişiden/firmadan **Alacağımız Var**.
- Eğer bakiye **eksi (-)** ise: Bu kişiye/firmaya **Borcumuz Var**.

Sisteme sadece 4 farklı işlem türü girebileceksiniz:
1. **Gönderilen Transfer (Ödeme Yaptık):** Bakiyeyi bizim lehimize artırır.
2. **Alınan Transfer (Ödeme Aldık):** Bakiyeyi karşı tarafın lehine azaltır.
3. **Verilen Ürün/Hizmet (Biz Fatura Kestik):** Bize borçlanırlar, bakiye artar.
4. **Alınan Ürün/Hizmet (Bize Fatura Kesildi):** Biz borçlanırız, bakiye azalır.

Böylece "Kime borç yazdım, kimden alacak düştüm" karmaşası bitecek. Sadece "Ona para gönderdim" veya "Ondan ürün aldım" diyeceksiniz, sistem nihai olarak "Sizin X TL borcunuz kaldı" veya "Sizin Y TL alacağınız kaldı" diyecek.

## Yapılacak Değişiklikler

### 1. Veritabanı ve Altyapı
- `payables` (Borç/Verecek) tabloları ve menüleri tamamen **kaldırılacak**.
- `transactions` tablosuna şu alanlar eklenecek/düzenlenecek:
  - `transaction_type`: `payment_out` (Gönderilen), `payment_in` (Alınan), `invoice_out` (Verilen Ürün), `invoice_in` (Alınan Ürün).
  - `payment_method`: Nakit, Havale/EFT, Kredi Kartı, Çek, Senet.
  - `exchange_rate`: Kur bilgisi (Varsayılan 1.0).
  - `currency`: Para birimi (TRY, USD, EUR vb).
- DB'deki `debit/credit` mantığı UI'dan tamamen soyutlanacak.

### 2. Arayüz (UI) Değişiklikleri
- Sol menüdeki "Borç / Alacak" ve "Mutabakat", "Krediler" gibi karmaşık sekmeler temizlenecek. Menü çok daha sade olacak: **Ana Ekran**, **Cari Hesaplar**, **İşlem Geçmişi**.
- Cari Hesap detayında "İşlem Ekle" butonuna basıldığında açılan pencerede kafa karıştırıcı muhasebe terimleri yerine sadece şu sorulacak: *"Ne işlemi eklemek istiyorsunuz? (Gönderilen Transfer, Alınan Transfer vb.)"*
- Kur (Döviz), İşlem Şekli (Havale vs.) ve Tarih seçimi ön plana çıkarılacak.
- Ana ekranda (Dashboard) sadece **"Toplam Alacaklarımız"** ve **"Toplam Borçlarımız"** net bir şekilde yazacak.

### 3. Yapay Zeka Özelliği
- PDF'den ekstre okuma özelliği menüden şimdilik gizlenecek. Temel "Gönderilen/Alınan" altyapısı hatasız çalıştıktan sonra, PDF modülü bu yeni sisteme uygun olarak (Gönderilen/Alınan mantığıyla) baştan entegre edilecek.

## Onay Süreci
Eğer bu basit ve net yapı (Gönderilen Transfer / Alınan Transfer) sizin için uygunsa, lütfen planı **onaylayın**. Onayınızın ardından kafa karıştırıcı muhasebe terimlerini silip sistemi yeniden inşa etmeye başlayacağım.
