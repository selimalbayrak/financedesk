# Finansman & Kredi Kartları Güncellemesi Walkthrough 🚀

İlettiğiniz talepler doğrultusunda uygulamanın finansal takip, kısa yollar ve kredi kartları özelliklerini güncelledim!

İşte yapılan tüm yeni geliştirmeler:

## 1. Kredi Kartları (Credit Cards) Yönetim Modülü 💳
- **Veritabanı Altyapısı:** Kredi kartları ve aylık kart hareketlerini güvenli şekilde tutmak için `credit_cards` ve `credit_card_transactions` tabloları Row Level Security (RLS) kuralları ile oluşturuldu.
- **Finansman Sekmesi:** Finansman sayfasına (`/finance`) dördüncü bir sekme olarak **"Kredi Kartları"** başlığı eklendi.
- **Özet Kart Metrikleri:** Sayfanın en üstünde "Toplam Kart Limiti", "Toplam Kart Borcu" ve "Kullanılabilir Limit" anlık olarak gösterilmektedir.
- **Kart Listesi:** Bireysel ve şirket kartlarınız, limit/borç doluluk oranını gösteren ilerleme çubukları (progress bar), hesap kesim ve son ödeme günleri ile birlikte kart tasarımı şeklinde listelenir.
- **Borç Ödeme:** "Ödeme Yap" butonu ile istediğiniz kasadan/bankadan kart borcunu ödeyebilir, hem kasayı hem de kart limitini güncelleyebilirsiniz.
- **PDF Ekstre Yükleme (AI):** "Ekstre Yükle" butonu ile kredi kartı PDF ekstrenizi seçip yükleyebilirsiniz. Arka plandaki Gemini yapay zeka modeli tüm harcama ve ödemeleri satır satır çıkarır, önizleme halinde size sunar. Onayladığınızda kart hareketlerine işler ve güncel borcu günceller.
- **Kart Hareketleri:** Her kartın altında bulunan "Kart Hareketleri" butonu ile o karta ait tüm harcamaları (eksi/kırmızı) ve ödemeleri (artı/yeşil) tarih ve açıklama detaylarıyla görebilirsiniz.

## 2. Kısa Yoldan Çek / Senet Girişi 📝
- **Form Entegrasyonu:** Hızlı işlem ekleme sayfasında (`/transactions/new`) "Çek / Senet" butonuna tıklandığında artık başka bir sayfaya yönlendirilmezsiniz.
- **Doğrudan Giriş:** Çek/senet giriş alanları, vade farkı (iskonto/kırdırma) seçenekleri ve masraf yansıtma hedefleri ile birlikte doğrudan formun içine entegre edildi. Tek sayfada işlemi kaydedip tamamlayabilirsiniz.

## 3. Kırdırma Masrafları İşlem Yönü 💸
- Çek/senet kırdırılırken kesilen faiz, komisyon ve banka masrafları artık veritabanına her zaman **`payment_out`** (eksi yönlü/giden ödeme) tipinde kaydedilir. Böylece son işlemler ve kasa defteri listelerinde kırmızı ok ile eksi bakiye olarak doğru şekilde görüntülenir.

## 4. UUID Kodu Yerine İsim Gösterimi 🏷️
- Formlardaki seçim kutularında (Select) seçilen Carinin, Kasanın veya personelin adı yerine veritabanı UUID kodunun yazması sorunu giderildi; artık seçim sonrasında da seçtiğiniz isimler düzgünce görüntülenir.
