# Finansman, Çek/Senet & Kredi Kartı Güncellemeleri Walkthrough 🚀

İlettiğiniz tüm yeni talepler doğrultusunda uygulamadaki finansal takip, kredi kartı ekstre analizleri ve çek/senet işlemlerini baştan aşağı yeniledik!

İşte yapılan tüm yeni geliştirmeler:

## 1. Kredi Kartlarında Asgari Ödeme ve Takvim Takibi 📅
- **Asgari Ödeme Tutarı:** Artık yeni bir kredi kartı eklerken asgari ödeme oranını (%) girebiliyorsunuz (varsayılan %40). Kart listesinde anlık güncel borcunuza göre asgari ödeme tutarı otomatik hesaplanıp kırmızı renkte gösterilmektedir.
- **Kart Ödeme & Kesim Takvimi:** Kredi Kartları sekmesinin en üstünde bugünün tarihinden itibaren yaklaşan tüm hesap kesim ve son ödeme günlerini sıralayan, kalan gün sayısını gösteren şık, yatay kaydırılabilir kronolojik bir **Ödeme Takvimi** eklendi!

## 2. Çoklu Ekstre Yükleme & Excel/XLS/XLSX Desteği (AI) 📊
- **Format Çeşitliliği:** Hem banka ekstreleri hem de kredi kartı ekstreleri için sadece PDF değil; **Excel (.xls, .xlsx), CSV, TXT, Resim** formatları da destekleniyor!
- **Spreadsheet Çözümleyici:** Excel ve CSV dosyaları server-side parse edilerek metne dönüştürülüyor ve Gemini yapay zekasına gönderiliyor. Böylece karakter kayıpları ve format hataları olmadan kusursuz veri çıkarımı sağlanıyor.
- **Çoklu Dosya Yükleme (Multi-upload):** Artık kredi kartı ekstrelerini yüklerken aynı anda birden fazla dosya seçip yükleyebilirsiniz. AI tüm dosyaları sırayla tarar, tüm hareketleri tek listede birleştirip tarih sırasına göre önizler.

## 3. Çek/Senet Düzenleme, Silme ve Ciro Etme (Devretme) 🔄
- **Düzenleme:** Çek/senet kartlarındaki menüden **Düzenle** seçeneği ile evrak türünü, tutarını, vadesini, muhatap bilgisini, bankasını ve durumunu dilediğiniz gibi güncelleyebilirsiniz.
- **Kaldırma:** Yanlış girilen çek ve senetleri tek tuşla **Sil** diyerek sistemden kaldırabilirsiniz.
- **Ciro Etme (Devretme):** Alınan çekleri (Portföyde olanlar) listedeki menüden **Ciro Et** diyerek seçtiğiniz bir tedarikçiye (Cari Hesaba) devredebilirsiniz. Ciro edildiğinde:
  - Çek durumu otomatik olarak `endorsed` (Ciro Edildi) olarak güncellenir.
  - Seçilen cari hesaba çek tutarında eksi yönlü (`payment_out`) ciro işlem hareketi işlenir.

## 4. Çek Kırdırmada Nakit Hedefi Seçimi 💸
- Çek/Senet eklerken veya portföydeki bir çeki kırdırırken (erken tahsilat/vade farkı):
  - Oluşan **masraflar (Faiz, komisyon, banka ücreti) her zaman eksi tutar (`payment_out`)** olarak yansıtılır.
  - Kırdırma sonucu elimize geçen **net nakit tutarın aktarılacağı hedefi serbestçe Kasa veya Cari Hesap** olarak seçebilirsiniz! Net tutar seçtiğiniz kasa veya cariye artı bakiye, masraf ise seçtiğiniz kasa veya cariye eksi bakiye olarak işlenir.
