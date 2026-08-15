export const DEFAULT_CHART_OF_ACCOUNTS = [
  {
    "code": "1",
    "name": "Dönen Varlıklar",
    "type": "MAIN",
    "parentCode": null
  },
  {
    "code": "10",
    "name": "Hazır Değerler",
    "type": "MAIN",
    "parentCode": "1"
  },
  {
    "code": "100",
    "name": "Kasa",
    "type": "SUB",
    "parentCode": "10"
  },
  {
    "code": "101",
    "name": "Alınan Çekler",
    "type": "SUB",
    "parentCode": "10"
  },
  {
    "code": "102",
    "name": "Bankalar",
    "type": "SUB",
    "parentCode": "10"
  },
  {
    "code": "103",
    "name": "Verilen Çek. ve Öde. Emirleri (-)",
    "type": "SUB",
    "parentCode": "10"
  },
  {
    "code": "108",
    "name": "Diğer Hazır Değerler",
    "type": "SUB",
    "parentCode": "10"
  },
  {
    "code": "11",
    "name": "Menkul Kıymetler",
    "type": "MAIN",
    "parentCode": "1"
  },
  {
    "code": "110",
    "name": "Hisse Senetleri",
    "type": "SUB",
    "parentCode": "11"
  },
  {
    "code": "111",
    "name": "Özel Kesim Tahvil ,Senet ve Bonoları",
    "type": "SUB",
    "parentCode": "11"
  },
  {
    "code": "112",
    "name": "Kamu Kesimi Tahvil , Senet ve Bonoları",
    "type": "SUB",
    "parentCode": "11"
  },
  {
    "code": "118",
    "name": "Diğer Menkul Kıymetler",
    "type": "SUB",
    "parentCode": "11"
  },
  {
    "code": "119",
    "name": "Menkul Kıymetler Değer Düşüklüğü Karşılığı (-)",
    "type": "SUB",
    "parentCode": "11"
  },
  {
    "code": "12",
    "name": "Ticari Alacaklar",
    "type": "MAIN",
    "parentCode": "1"
  },
  {
    "code": "120",
    "name": "Alıcılar",
    "type": "SUB",
    "parentCode": "12"
  },
  {
    "code": "121",
    "name": "Alacak Senetleri",
    "type": "SUB",
    "parentCode": "12"
  },
  {
    "code": "122",
    "name": "Alacak Senetleri Reeskontu (-)",
    "type": "SUB",
    "parentCode": "12"
  },
  {
    "code": "124",
    "name": "Kazanılmamış Finansal Kiralama Faiz Gelirleri(-)",
    "type": "SUB",
    "parentCode": "12"
  },
  {
    "code": "126",
    "name": "Verilen Depozito ve Teminatlar",
    "type": "SUB",
    "parentCode": "12"
  },
  {
    "code": "127",
    "name": "Diğer Ticari Alacaklar Senet ve Bonoları",
    "type": "SUB",
    "parentCode": "12"
  },
  {
    "code": "128",
    "name": "Şüpheli Ticari Alacaklar",
    "type": "SUB",
    "parentCode": "12"
  },
  {
    "code": "129",
    "name": "Şüpheli Ticari Alacaklar Karşılığı (-)",
    "type": "SUB",
    "parentCode": "12"
  },
  {
    "code": "13",
    "name": "Diğer Alacaklar",
    "type": "MAIN",
    "parentCode": "1"
  },
  {
    "code": "131",
    "name": "Ortaklardan Alacaklar",
    "type": "SUB",
    "parentCode": "13"
  },
  {
    "code": "132",
    "name": "İştiraklerden Alacaklar",
    "type": "SUB",
    "parentCode": "13"
  },
  {
    "code": "133",
    "name": "Bağlı Ortaklıklardan Alacaklar",
    "type": "SUB",
    "parentCode": "13"
  },
  {
    "code": "135",
    "name": "Personelden Alacaklar",
    "type": "SUB",
    "parentCode": "13"
  },
  {
    "code": "136",
    "name": "Diğer Çeşitli Alacaklar",
    "type": "SUB",
    "parentCode": "13"
  },
  {
    "code": "137",
    "name": "Diğer Alacak Senetleri Reeskontu (-)",
    "type": "SUB",
    "parentCode": "13"
  },
  {
    "code": "138",
    "name": "Şüpheli Diğer Alacaklar",
    "type": "SUB",
    "parentCode": "13"
  },
  {
    "code": "139",
    "name": "Şüpheli Diğer Alacaklar Karş. (-)",
    "type": "SUB",
    "parentCode": "13"
  },
  {
    "code": "15",
    "name": "Stoklar",
    "type": "MAIN",
    "parentCode": "1"
  },
  {
    "code": "150",
    "name": "İlk Madde ve Malzeme",
    "type": "SUB",
    "parentCode": "15"
  },
  {
    "code": "151",
    "name": "Yarı Mamuller - Üretim",
    "type": "SUB",
    "parentCode": "15"
  },
  {
    "code": "152",
    "name": "Mamuller",
    "type": "SUB",
    "parentCode": "15"
  },
  {
    "code": "153",
    "name": "Ticari Mallar",
    "type": "SUB",
    "parentCode": "15"
  },
  {
    "code": "157",
    "name": "Diğer Stoklar",
    "type": "SUB",
    "parentCode": "15"
  },
  {
    "code": "158",
    "name": "Stok Değer Düşüklüğü Karşı (-)",
    "type": "SUB",
    "parentCode": "15"
  },
  {
    "code": "159",
    "name": "Verilen Sipariş Avansları",
    "type": "SUB",
    "parentCode": "15"
  },
  {
    "code": "17",
    "name": "Yıllara Yaygın İnşaat ve Onarım Maliyetleri",
    "type": "MAIN",
    "parentCode": "1"
  },
  {
    "code": "170",
    "name": "Yıllara Yaygın İnşaat ve Onarım Maliyetleri",
    "type": "SUB",
    "parentCode": "17"
  },
  {
    "code": "178",
    "name": "Yıllara Yaygın İnşaat Enflasyon Düzeltme",
    "type": "SUB",
    "parentCode": "17"
  },
  {
    "code": "179",
    "name": "Taşeronlara Verilen Avanslar",
    "type": "SUB",
    "parentCode": "17"
  },
  {
    "code": "18",
    "name": "Gelecek Aylara Ait Giderler ve Gelir Tahakkukları",
    "type": "MAIN",
    "parentCode": "1"
  },
  {
    "code": "180",
    "name": "Gelecek Aylara Ait Giderler",
    "type": "SUB",
    "parentCode": "18"
  },
  {
    "code": "181",
    "name": "Gelir Tahakkukları",
    "type": "SUB",
    "parentCode": "18"
  },
  {
    "code": "19",
    "name": "Diğer Dönen Varlıklar",
    "type": "MAIN",
    "parentCode": "1"
  },
  {
    "code": "190",
    "name": "Devreden KDV",
    "type": "SUB",
    "parentCode": "19"
  },
  {
    "code": "191",
    "name": "İndirilecek KDV",
    "type": "SUB",
    "parentCode": "19"
  },
  {
    "code": "192",
    "name": "Diğer KDV",
    "type": "SUB",
    "parentCode": "19"
  },
  {
    "code": "193",
    "name": "Peşin Ödenen Vergiler ve Fonlar",
    "type": "SUB",
    "parentCode": "19"
  },
  {
    "code": "195",
    "name": "İş Avansları",
    "type": "SUB",
    "parentCode": "19"
  },
  {
    "code": "196",
    "name": "Personel Avansları",
    "type": "SUB",
    "parentCode": "19"
  },
  {
    "code": "197",
    "name": "Sayım ve Tesellüm Noksanlar",
    "type": "SUB",
    "parentCode": "19"
  },
  {
    "code": "198",
    "name": "Diğer Çeşitli Dönen Varlıklar",
    "type": "SUB",
    "parentCode": "19"
  },
  {
    "code": "199",
    "name": "Diğer Dönen Varlık. Karşılığı (-)",
    "type": "SUB",
    "parentCode": "19"
  },
  {
    "code": "2",
    "name": "Duran Varlıklar",
    "type": "MAIN",
    "parentCode": null
  },
  {
    "code": "22",
    "name": "Ticari Alacaklar",
    "type": "MAIN",
    "parentCode": "2"
  },
  {
    "code": "220",
    "name": "Alıcılar",
    "type": "SUB",
    "parentCode": "22"
  },
  {
    "code": "221",
    "name": "Alacak Senetleri",
    "type": "SUB",
    "parentCode": "22"
  },
  {
    "code": "222",
    "name": "Alacak Senetleri Reeskontu (-)",
    "type": "SUB",
    "parentCode": "22"
  },
  {
    "code": "224",
    "name": "Kazanılmamış Finansal Kiralama Faiz Gelirleri(-)",
    "type": "SUB",
    "parentCode": "22"
  },
  {
    "code": "226",
    "name": "Verilen Depozito ve Teminatlar",
    "type": "SUB",
    "parentCode": "22"
  },
  {
    "code": "229",
    "name": "Şüpheli Alacaklar Karşılığı (-)",
    "type": "SUB",
    "parentCode": "22"
  },
  {
    "code": "23",
    "name": "Diğer Alacaklar",
    "type": "MAIN",
    "parentCode": "2"
  },
  {
    "code": "231",
    "name": "Ortaklardan Alacaklar",
    "type": "SUB",
    "parentCode": "23"
  },
  {
    "code": "232",
    "name": "İştiraklerden Alacaklar",
    "type": "SUB",
    "parentCode": "23"
  },
  {
    "code": "233",
    "name": "Bağlı Ortaklıklardan Alacaklar",
    "type": "SUB",
    "parentCode": "23"
  },
  {
    "code": "235",
    "name": "Personelden Alacaklar",
    "type": "SUB",
    "parentCode": "23"
  },
  {
    "code": "236",
    "name": "Diğer Çeşitli Alacaklar",
    "type": "SUB",
    "parentCode": "23"
  },
  {
    "code": "237",
    "name": "Diğer Alacak Senet. Reeskontu (-)",
    "type": "SUB",
    "parentCode": "23"
  },
  {
    "code": "239",
    "name": "Şüpheli Diğer Alacaklar Karşılığı (-)",
    "type": "SUB",
    "parentCode": "23"
  },
  {
    "code": "24",
    "name": "Mali Duran Varlıklar",
    "type": "MAIN",
    "parentCode": "2"
  },
  {
    "code": "240",
    "name": "Bağlı Menkul Kıymetler",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "241",
    "name": "Bağlı Menkul Kıymetler Değer Düşüklüğü Karşılığı (-)",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "242",
    "name": "İştirakler",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "243",
    "name": "İştiraklere Sermaye Taahhütleri (-)",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "244",
    "name": "İştirakler Sermaye Payları Değer Düşüklüğü Karşılığı (-)",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "245",
    "name": "Bağlı Ortaklıklar",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "246",
    "name": "Bağlı Ortaklıklara Sermaye Taahhütleri (-)",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "247",
    "name": "Bağlı Ortaklıklar Sermaye Payları Değer Düşüklüğü Karşılığı (-)",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "248",
    "name": "Diğer Mali Duran Varlıklar",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "249",
    "name": "Diğer Mali Duran Varlıklar Karşılığı (-)",
    "type": "SUB",
    "parentCode": "24"
  },
  {
    "code": "25",
    "name": "Maddi Duran Varlıklar",
    "type": "MAIN",
    "parentCode": "2"
  },
  {
    "code": "250",
    "name": "Arazi ve Arsalar",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "251",
    "name": "Yeraltı ve Yerüstü Düzenleri",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "252",
    "name": "Binalar",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "253",
    "name": "Tesis, Makine ve Cihazlar",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "254",
    "name": "Taşıtlar",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "255",
    "name": "Demirbaşlar",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "256",
    "name": "Diğer Maddi Duran Varlıklar",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "257",
    "name": "Birikmiş Amortismanlar (-)",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "258",
    "name": "Yapılmakta Olan Yatırımlar",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "259",
    "name": "Verilen Avanslar",
    "type": "SUB",
    "parentCode": "25"
  },
  {
    "code": "26",
    "name": "Maddi Olmayan Duran Varlıklar",
    "type": "MAIN",
    "parentCode": "2"
  },
  {
    "code": "260",
    "name": "Haklar",
    "type": "SUB",
    "parentCode": "26"
  },
  {
    "code": "261",
    "name": "Şerefiye",
    "type": "SUB",
    "parentCode": "26"
  },
  {
    "code": "262",
    "name": "Kuruluş ve Örgütlenme Giderleri",
    "type": "SUB",
    "parentCode": "26"
  },
  {
    "code": "263",
    "name": "Araştırma ve Geliştirme Giderleri",
    "type": "SUB",
    "parentCode": "26"
  },
  {
    "code": "264",
    "name": "Özel Maliyetler",
    "type": "SUB",
    "parentCode": "26"
  },
  {
    "code": "267",
    "name": "Diğer Maddi Olmayan Duran Varlıklar",
    "type": "SUB",
    "parentCode": "26"
  },
  {
    "code": "268",
    "name": "Birikmiş Amortismanlar (-)",
    "type": "SUB",
    "parentCode": "26"
  },
  {
    "code": "269",
    "name": "Verilen Avanslar",
    "type": "SUB",
    "parentCode": "26"
  },
  {
    "code": "27",
    "name": "Özel Tükenmeye Tabi Varlıklar",
    "type": "MAIN",
    "parentCode": "2"
  },
  {
    "code": "271",
    "name": "Arama Giderleri",
    "type": "SUB",
    "parentCode": "27"
  },
  {
    "code": "272",
    "name": "Hazırlık ve Geliştirme Giderleri",
    "type": "SUB",
    "parentCode": "27"
  },
  {
    "code": "277",
    "name": "Diğer Özel Tükenmeye Tabi Varlıklar",
    "type": "SUB",
    "parentCode": "27"
  },
  {
    "code": "278",
    "name": "Birikmiş Tükenme Payları (-)",
    "type": "SUB",
    "parentCode": "27"
  },
  {
    "code": "279",
    "name": "Verilen Avanslar",
    "type": "SUB",
    "parentCode": "27"
  },
  {
    "code": "28",
    "name": "Gelecek Yıllara Ait Giderler ve Gelir Tahakkukları",
    "type": "MAIN",
    "parentCode": "2"
  },
  {
    "code": "280",
    "name": "Gelecek Yıllara Ait Giderler",
    "type": "SUB",
    "parentCode": "28"
  },
  {
    "code": "281",
    "name": "Gelir Tahakkukları",
    "type": "SUB",
    "parentCode": "28"
  },
  {
    "code": "29",
    "name": "Diğer Duran Varlıklar",
    "type": "MAIN",
    "parentCode": "2"
  },
  {
    "code": "291",
    "name": "Gelecek Yıllarda İndirilecek KDV",
    "type": "SUB",
    "parentCode": "29"
  },
  {
    "code": "292",
    "name": "Diğer KDV",
    "type": "SUB",
    "parentCode": "29"
  },
  {
    "code": "293",
    "name": "Gelecek Yıllar İhtiyacı Stoklar",
    "type": "SUB",
    "parentCode": "29"
  },
  {
    "code": "294",
    "name": "Elden Çıkarılacak Stoklar ve Maddi Duran Varlıklar",
    "type": "SUB",
    "parentCode": "29"
  },
  {
    "code": "295",
    "name": "Peşin Ödenen Vergiler ve Fonlar",
    "type": "SUB",
    "parentCode": "29"
  },
  {
    "code": "297",
    "name": "Diğer Çeşitli Duran Varlıklar",
    "type": "SUB",
    "parentCode": "29"
  },
  {
    "code": "298",
    "name": "Stok Değer Düşüklüğü Karşı. (-)",
    "type": "SUB",
    "parentCode": "29"
  },
  {
    "code": "299",
    "name": "Birikmiş Amortismanlar (-)",
    "type": "SUB",
    "parentCode": "29"
  },
  {
    "code": "3",
    "name": "Kısa Vadeli Yabancı Kaynaklar",
    "type": "MAIN",
    "parentCode": null
  },
  {
    "code": "30",
    "name": "Mali Borçlar",
    "type": "MAIN",
    "parentCode": "3"
  },
  {
    "code": "300",
    "name": "Banka Kredileri",
    "type": "SUB",
    "parentCode": "30"
  },
  {
    "code": "301",
    "name": "Finansal Kiralama İşlemlerinden Borçlar",
    "type": "SUB",
    "parentCode": "30"
  },
  {
    "code": "302",
    "name": "Ertelenmiş Finansal Kiralama Borçlanma Maliyetleri(-)",
    "type": "SUB",
    "parentCode": "30"
  },
  {
    "code": "303",
    "name": "Uzun Vadeli Kredilerin Anapara Taksitleri ve Faizleri",
    "type": "SUB",
    "parentCode": "30"
  },
  {
    "code": "304",
    "name": "Tahvil Anapara Borç ,Taksit ve Faizleri",
    "type": "SUB",
    "parentCode": "30"
  },
  {
    "code": "305",
    "name": "Çıkarılmış Bonolar ve Senetler",
    "type": "SUB",
    "parentCode": "30"
  },
  {
    "code": "306",
    "name": "Çıkarılmış Diğer Menkul Kıymetler",
    "type": "SUB",
    "parentCode": "30"
  },
  {
    "code": "308",
    "name": "Menkul Kıymetler İhraç Farkları (-)",
    "type": "SUB",
    "parentCode": "30"
  },
  {
    "code": "309",
    "name": "Diğer Mali Borçlar",
    "type": "SUB",
    "parentCode": "30"
  },
  {
    "code": "32",
    "name": "Ticari Borçlar",
    "type": "MAIN",
    "parentCode": "3"
  },
  {
    "code": "320",
    "name": "Satıcılar",
    "type": "SUB",
    "parentCode": "32"
  },
  {
    "code": "321",
    "name": "Borç Senetleri",
    "type": "SUB",
    "parentCode": "32"
  },
  {
    "code": "322",
    "name": "Borç Senetleri Reeskontu (-)",
    "type": "SUB",
    "parentCode": "32"
  },
  {
    "code": "326",
    "name": "Alınan Depozito ve Teminatlar",
    "type": "SUB",
    "parentCode": "32"
  },
  {
    "code": "329",
    "name": "Diğer Ticari Borçlar",
    "type": "SUB",
    "parentCode": "32"
  },
  {
    "code": "33",
    "name": "Diğer Borçlar",
    "type": "MAIN",
    "parentCode": "3"
  },
  {
    "code": "331",
    "name": "Ortaklara Borçlar",
    "type": "SUB",
    "parentCode": "33"
  },
  {
    "code": "332",
    "name": "İştiraklere Borçlar",
    "type": "SUB",
    "parentCode": "33"
  },
  {
    "code": "333",
    "name": "Bağlı Ortaklıklara Borçlar",
    "type": "SUB",
    "parentCode": "33"
  },
  {
    "code": "335",
    "name": "Personele Borçlar",
    "type": "SUB",
    "parentCode": "33"
  },
  {
    "code": "336",
    "name": "Diğer Çeşitli Borçlar",
    "type": "SUB",
    "parentCode": "33"
  },
  {
    "code": "337",
    "name": "Diğer Borç Senetleri Reeskontu (-)",
    "type": "SUB",
    "parentCode": "33"
  },
  {
    "code": "34",
    "name": "Alınan Avanslar",
    "type": "MAIN",
    "parentCode": "3"
  },
  {
    "code": "340",
    "name": "Alınan Sipariş Avansları",
    "type": "SUB",
    "parentCode": "34"
  },
  {
    "code": "349",
    "name": "Alınan Diğer Avanslar",
    "type": "SUB",
    "parentCode": "34"
  },
  {
    "code": "35",
    "name": "Yıllara Yaygın İnşaat ve Onarım Hakedişleri",
    "type": "MAIN",
    "parentCode": "3"
  },
  {
    "code": "350",
    "name": "Yıllara Yaygın İnşaat ve Onarım Hakedişleri",
    "type": "SUB",
    "parentCode": "35"
  },
  {
    "code": "358",
    "name": "Yıllara Yaygın İnşaat Enflasyon Düzeltme",
    "type": "SUB",
    "parentCode": "35"
  },
  {
    "code": "36",
    "name": "Ödenecek vergi ve Diğer Yükümlülükler",
    "type": "MAIN",
    "parentCode": "3"
  },
  {
    "code": "360",
    "name": "Ödenecek Vergi ve Fonlar",
    "type": "SUB",
    "parentCode": "36"
  },
  {
    "code": "361",
    "name": "Ödenecek Sosyal Güvenlik Kesintileri",
    "type": "SUB",
    "parentCode": "36"
  },
  {
    "code": "368",
    "name": "Vadesi Geçmiş, Erte. veya Taksi. Vergi ve Diğ. Yüküm.",
    "type": "SUB",
    "parentCode": "36"
  },
  {
    "code": "369",
    "name": "Ödenecek Diğer Yükümlülükler",
    "type": "SUB",
    "parentCode": "36"
  },
  {
    "code": "37",
    "name": "Borç ve Gider Karşılıkları",
    "type": "MAIN",
    "parentCode": "3"
  },
  {
    "code": "370",
    "name": "Dönem Karı Vergi ve Diğer Yasal Yükümlülük Karşılıkları",
    "type": "SUB",
    "parentCode": "37"
  },
  {
    "code": "371",
    "name": "Dönem Karının Peşin Ödenen Vergi ve Diğer Yükümlülükleri (-)",
    "type": "SUB",
    "parentCode": "37"
  },
  {
    "code": "372",
    "name": "Kıdem Tazminatı Karşılığı",
    "type": "SUB",
    "parentCode": "37"
  },
  {
    "code": "373",
    "name": "Maliyet Giderleri Karşılığı",
    "type": "SUB",
    "parentCode": "37"
  },
  {
    "code": "379",
    "name": "Diğer Borç ve Gider Karşılıkları",
    "type": "SUB",
    "parentCode": "37"
  },
  {
    "code": "38",
    "name": "Gelecek Aylara Ait Gelirler ve Gider Tahakkukları",
    "type": "MAIN",
    "parentCode": "3"
  },
  {
    "code": "380",
    "name": "Gelecek Aylara Ait Gelirler",
    "type": "SUB",
    "parentCode": "38"
  },
  {
    "code": "381",
    "name": "Gider Tahakkukları",
    "type": "SUB",
    "parentCode": "38"
  },
  {
    "code": "39",
    "name": "Diğer Kısa Vadeli Yabancı Kaynaklar",
    "type": "MAIN",
    "parentCode": "3"
  },
  {
    "code": "391",
    "name": "Hesaplanan KDV",
    "type": "SUB",
    "parentCode": "39"
  },
  {
    "code": "392",
    "name": "Diğer KDV",
    "type": "SUB",
    "parentCode": "39"
  },
  {
    "code": "393",
    "name": "Merkez ve Şubeler Cari Hesabı",
    "type": "SUB",
    "parentCode": "39"
  },
  {
    "code": "397",
    "name": "Sayım ve Tesellüm Fazlaları",
    "type": "SUB",
    "parentCode": "39"
  },
  {
    "code": "399",
    "name": "Diğer Çeşitli Yabancı Kaynaklar",
    "type": "SUB",
    "parentCode": "39"
  },
  {
    "code": "4",
    "name": "Uzun Vadeli Yabancı Kaynaklar",
    "type": "MAIN",
    "parentCode": null
  },
  {
    "code": "40",
    "name": "Mali Borçlar",
    "type": "MAIN",
    "parentCode": "4"
  },
  {
    "code": "400",
    "name": "Banka Kredileri",
    "type": "SUB",
    "parentCode": "40"
  },
  {
    "code": "401",
    "name": "Finansal Kiralama İşlemlerinden Borçlar",
    "type": "SUB",
    "parentCode": "40"
  },
  {
    "code": "402",
    "name": "Ertelenmiş Finansal Kiralama Borçlanma Maliyetleri(-)",
    "type": "SUB",
    "parentCode": "40"
  },
  {
    "code": "405",
    "name": "Çıkarılmış Tahviller",
    "type": "SUB",
    "parentCode": "40"
  },
  {
    "code": "407",
    "name": "Çıkarılmış Diğer Menkul Kıymetler",
    "type": "SUB",
    "parentCode": "40"
  },
  {
    "code": "408",
    "name": "Menkul Kıymetler İhraç Farkı (-)",
    "type": "SUB",
    "parentCode": "40"
  },
  {
    "code": "409",
    "name": "Diğer Mali Borçlar",
    "type": "SUB",
    "parentCode": "40"
  },
  {
    "code": "42",
    "name": "Ticari Borçlar",
    "type": "MAIN",
    "parentCode": "4"
  },
  {
    "code": "420",
    "name": "Satıcılar",
    "type": "SUB",
    "parentCode": "42"
  },
  {
    "code": "421",
    "name": "Borç Senetleri",
    "type": "SUB",
    "parentCode": "42"
  },
  {
    "code": "422",
    "name": "Borç Senetleri Reeskontu (-)",
    "type": "SUB",
    "parentCode": "42"
  },
  {
    "code": "426",
    "name": "Alınan Depozito ve Teminatlar",
    "type": "SUB",
    "parentCode": "42"
  },
  {
    "code": "429",
    "name": "Diğer Ticari Borçlar",
    "type": "SUB",
    "parentCode": "42"
  },
  {
    "code": "43",
    "name": "Diğer Borçlar",
    "type": "MAIN",
    "parentCode": "4"
  },
  {
    "code": "431",
    "name": "Ortaklara Borçlar",
    "type": "SUB",
    "parentCode": "43"
  },
  {
    "code": "432",
    "name": "İştiraklere Borçlar",
    "type": "SUB",
    "parentCode": "43"
  },
  {
    "code": "433",
    "name": "Bağlı Ortaklıklara Borçlar",
    "type": "SUB",
    "parentCode": "43"
  },
  {
    "code": "436",
    "name": "Diğer Çeşitli Borçlar",
    "type": "SUB",
    "parentCode": "43"
  },
  {
    "code": "437",
    "name": "Diğer Borçlar Senetleri Reeskontu. (-)",
    "type": "SUB",
    "parentCode": "43"
  },
  {
    "code": "438",
    "name": "Kamuya Olan Ertelenmiş veya Taksitlendirilmiş Borçlar",
    "type": "SUB",
    "parentCode": "43"
  },
  {
    "code": "44",
    "name": "Alınan Avanslar",
    "type": "MAIN",
    "parentCode": "4"
  },
  {
    "code": "440",
    "name": "Alınan Sipariş Avansları",
    "type": "SUB",
    "parentCode": "44"
  },
  {
    "code": "449",
    "name": "Alınan Diğer Avanslar",
    "type": "SUB",
    "parentCode": "44"
  },
  {
    "code": "47",
    "name": "Borç ve Gider Karşılıkları",
    "type": "MAIN",
    "parentCode": "4"
  },
  {
    "code": "472",
    "name": "Kıdem Tazminatı Karşılığı",
    "type": "SUB",
    "parentCode": "47"
  },
  {
    "code": "479",
    "name": "Diğer Borç ve Gider Karşılıkları",
    "type": "SUB",
    "parentCode": "47"
  },
  {
    "code": "48",
    "name": "Gelecek Yıllara Ait Gelirler ve Gider Tahakkukları",
    "type": "MAIN",
    "parentCode": "4"
  },
  {
    "code": "480",
    "name": "Gelecek Yıllara Ait Gelirler",
    "type": "SUB",
    "parentCode": "48"
  },
  {
    "code": "481",
    "name": "Gider Tahakkukları",
    "type": "SUB",
    "parentCode": "48"
  },
  {
    "code": "49",
    "name": "Diğer Uzun Vadeli Yabancı Kaynaklar",
    "type": "MAIN",
    "parentCode": "4"
  },
  {
    "code": "492",
    "name": "Gelecek Yıllara Ertelenen veya Terkin Edilecek Katma Değer Vergisi",
    "type": "SUB",
    "parentCode": "49"
  },
  {
    "code": "493",
    "name": "Tesise Katılma Payları",
    "type": "SUB",
    "parentCode": "49"
  },
  {
    "code": "499",
    "name": "Diğer Çeşitli Uzun Vadeli Yabancı Kaynaklar",
    "type": "SUB",
    "parentCode": "49"
  },
  {
    "code": "5",
    "name": "Öz Kaynaklar",
    "type": "MAIN",
    "parentCode": null
  },
  {
    "code": "50",
    "name": "Ödenmiş Sermaye",
    "type": "MAIN",
    "parentCode": "5"
  },
  {
    "code": "500",
    "name": "Sermaye",
    "type": "SUB",
    "parentCode": "50"
  },
  {
    "code": "501",
    "name": "Ödenmemiş Sermaye (-)",
    "type": "SUB",
    "parentCode": "50"
  },
  {
    "code": "502",
    "name": "Sermaye Düzeltmesi Olumlu Farkları",
    "type": "SUB",
    "parentCode": "50"
  },
  {
    "code": "503",
    "name": "Sermaye Düzeltmesi Olumsuz Farkları (-)",
    "type": "SUB",
    "parentCode": "50"
  },
  {
    "code": "52",
    "name": "Sermaye Yedekleri",
    "type": "MAIN",
    "parentCode": "5"
  },
  {
    "code": "520",
    "name": "Hisse Senedi İhraç Primleri",
    "type": "SUB",
    "parentCode": "52"
  },
  {
    "code": "521",
    "name": "Hisse Senedi İptal Karları",
    "type": "SUB",
    "parentCode": "52"
  },
  {
    "code": "522",
    "name": "MDV Yeniden Değerleme Artışları",
    "type": "SUB",
    "parentCode": "52"
  },
  {
    "code": "523",
    "name": "İştirakler Yeniden Değerleme Artışları",
    "type": "SUB",
    "parentCode": "52"
  },
  {
    "code": "524",
    "name": "Maliyet Artışları Fonu",
    "type": "SUB",
    "parentCode": "52"
  },
  {
    "code": "529",
    "name": "Diğer Sermaye Yedekleri",
    "type": "SUB",
    "parentCode": "52"
  },
  {
    "code": "54",
    "name": "Kar Yedekleri",
    "type": "MAIN",
    "parentCode": "5"
  },
  {
    "code": "540",
    "name": "Yasal Yedekler",
    "type": "SUB",
    "parentCode": "54"
  },
  {
    "code": "541",
    "name": "Statü Yedekleri",
    "type": "SUB",
    "parentCode": "54"
  },
  {
    "code": "542",
    "name": "Olağanüstü Yedekler",
    "type": "SUB",
    "parentCode": "54"
  },
  {
    "code": "548",
    "name": "Diğer Kar Yedekleri",
    "type": "SUB",
    "parentCode": "54"
  },
  {
    "code": "549",
    "name": "Özel Fonlar",
    "type": "SUB",
    "parentCode": "54"
  },
  {
    "code": "57",
    "name": "Geçmiş Yıllar Karları",
    "type": "MAIN",
    "parentCode": "5"
  },
  {
    "code": "570",
    "name": "Geçmiş Yıllar Karları",
    "type": "SUB",
    "parentCode": "57"
  },
  {
    "code": "58",
    "name": "Geçmiş Yıllar Zararları",
    "type": "MAIN",
    "parentCode": "5"
  },
  {
    "code": "580",
    "name": "Geçmiş Yıllar Zararları (-)",
    "type": "SUB",
    "parentCode": "58"
  },
  {
    "code": "59",
    "name": "Dönem Net Karı (Zararı)",
    "type": "MAIN",
    "parentCode": "5"
  },
  {
    "code": "590",
    "name": "Dönem Net Karı",
    "type": "SUB",
    "parentCode": "59"
  },
  {
    "code": "591",
    "name": "Dönem Net Zararı (-)",
    "type": "SUB",
    "parentCode": "59"
  },
  {
    "code": "6",
    "name": "Gelir Tablosu",
    "type": "MAIN",
    "parentCode": null
  },
  {
    "code": "60",
    "name": "Brüt Satışlar",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "600",
    "name": "Yurtiçi Satışlar",
    "type": "SUB",
    "parentCode": "60"
  },
  {
    "code": "601",
    "name": "Yurtdışı Satışlar",
    "type": "SUB",
    "parentCode": "60"
  },
  {
    "code": "602",
    "name": "Diğer Gelirler",
    "type": "SUB",
    "parentCode": "60"
  },
  {
    "code": "61",
    "name": "Satış İndirimleri(-)",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "610",
    "name": "Satıştan İadeler (-)",
    "type": "SUB",
    "parentCode": "61"
  },
  {
    "code": "611",
    "name": "Satış İskontoları (-)",
    "type": "SUB",
    "parentCode": "61"
  },
  {
    "code": "612",
    "name": "Diğer İndirimler (-)",
    "type": "SUB",
    "parentCode": "61"
  },
  {
    "code": "62",
    "name": "Satışların Maliyeti(-)",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "620",
    "name": "Satılan Mamuller Maliyeti (-)",
    "type": "SUB",
    "parentCode": "62"
  },
  {
    "code": "621",
    "name": "Satılan Ticari Mallar Maliyeti (-)",
    "type": "SUB",
    "parentCode": "62"
  },
  {
    "code": "622",
    "name": "Satılan Hizmet Maliyeti (-)",
    "type": "SUB",
    "parentCode": "62"
  },
  {
    "code": "623",
    "name": "Diğer Satışların Maliyeti (-)",
    "type": "SUB",
    "parentCode": "62"
  },
  {
    "code": "63",
    "name": "Faaliyet Giderleri (-)",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "630",
    "name": "Araştırma ve Geliştirme Gider (-)",
    "type": "SUB",
    "parentCode": "63"
  },
  {
    "code": "631",
    "name": "Pazarlama ,Satış ve Dağıtım Gider (-)",
    "type": "SUB",
    "parentCode": "63"
  },
  {
    "code": "632",
    "name": "Genel Yönetim Giderleri(-)",
    "type": "SUB",
    "parentCode": "63"
  },
  {
    "code": "64",
    "name": "Diğer Faaliyetlerden Olağan Gelir ve Karlar",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "640",
    "name": "İştiraklerden Temettü Gelirleri",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "641",
    "name": "Bağlı Ortaklıklardan Temettü Gelirleri",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "642",
    "name": "Faiz Gelirleri",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "643",
    "name": "Komisyon Gelirleri",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "644",
    "name": "Konusu Kalmayan Karşılıklar",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "645",
    "name": "Menkul Kıymet Satış Karları",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "646",
    "name": "Kambiyo Karları",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "647",
    "name": "Reeskont Faiz Gelirleri",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "648",
    "name": "Enflasyon Düzeltmesi Karları",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "649",
    "name": "Diğer Olağan Gelir ve Karlar",
    "type": "SUB",
    "parentCode": "64"
  },
  {
    "code": "65",
    "name": "Diğer Faaliyetlerden Olağan Gider ve Zararlar(-)",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "653",
    "name": "Komisyon Giderleri (-)",
    "type": "SUB",
    "parentCode": "65"
  },
  {
    "code": "654",
    "name": "Karşılık Giderleri (-)",
    "type": "SUB",
    "parentCode": "65"
  },
  {
    "code": "655",
    "name": "Menkul Kıymet Satış Zararları (-)",
    "type": "SUB",
    "parentCode": "65"
  },
  {
    "code": "656",
    "name": "Kambiyo Zararları (-)",
    "type": "SUB",
    "parentCode": "65"
  },
  {
    "code": "657",
    "name": "Reeskont Faiz Giderleri (-)",
    "type": "SUB",
    "parentCode": "65"
  },
  {
    "code": "658",
    "name": "Enflasyon Düzeltmesi Zararları(-)",
    "type": "SUB",
    "parentCode": "65"
  },
  {
    "code": "659",
    "name": "Diğer Olağan Gider ve Zararlar (-)",
    "type": "SUB",
    "parentCode": "65"
  },
  {
    "code": "66",
    "name": "Finansman Giderleri(-)",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "660",
    "name": "Kısa Vadeli Borçlanma Giderleri (-)",
    "type": "SUB",
    "parentCode": "66"
  },
  {
    "code": "661",
    "name": "Uzun Vadeli Borçlanma Giderleri (-)",
    "type": "SUB",
    "parentCode": "66"
  },
  {
    "code": "67",
    "name": "Olağandışı Gelir ve Karlar",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "671",
    "name": "Önceki Dönem Gelir ve Karları",
    "type": "SUB",
    "parentCode": "67"
  },
  {
    "code": "679",
    "name": "Diğer Olağandışı Gelir ve Karlar",
    "type": "SUB",
    "parentCode": "67"
  },
  {
    "code": "68",
    "name": "Olağandışı Gider ve Zararlar(-)",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "680",
    "name": "Çalışmayan Kısım Gider ve Zararları (-)",
    "type": "SUB",
    "parentCode": "68"
  },
  {
    "code": "681",
    "name": "Önceki Dönem Gider ve Zararları (-)",
    "type": "SUB",
    "parentCode": "68"
  },
  {
    "code": "689",
    "name": "Diğer Olağandışı Gider ve Zararlar (-)",
    "type": "SUB",
    "parentCode": "68"
  },
  {
    "code": "69",
    "name": "Dönem Net Kar Veya Zararı",
    "type": "MAIN",
    "parentCode": "6"
  },
  {
    "code": "690",
    "name": "Dönem Karı veya Zararı",
    "type": "SUB",
    "parentCode": "69"
  },
  {
    "code": "691",
    "name": "Dönem Karı Vergi ve Diğer Yasal Yükümlülük Karşılıkları (-)",
    "type": "SUB",
    "parentCode": "69"
  },
  {
    "code": "692",
    "name": "Dönem Net Karı veya Zararı",
    "type": "SUB",
    "parentCode": "69"
  },
  {
    "code": "697",
    "name": "Yıllara Yaygın İnşaat Enflasyon Düzeltme",
    "type": "SUB",
    "parentCode": "69"
  },
  {
    "code": "698",
    "name": "Enflasyon Düzeltme",
    "type": "SUB",
    "parentCode": "69"
  },
  {
    "code": "7",
    "name": "Maliyet Hesapları",
    "type": "MAIN",
    "parentCode": null
  },
  {
    "code": "70",
    "name": "Maliyet Muhasebesi Bağlantı Hesapları",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "700",
    "name": "Maliyet Muhasebesi Bağlantı Hesapları",
    "type": "SUB",
    "parentCode": "70"
  },
  {
    "code": "701",
    "name": "Maliyet Muhasebesi Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "70"
  },
  {
    "code": "71",
    "name": "Direkt İlk Madde ve Malzeme Giderleri",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "710",
    "name": "Direkt İlk Madde ve Malzeme Giderleri",
    "type": "SUB",
    "parentCode": "71"
  },
  {
    "code": "711",
    "name": "Direkt İlk Madde ve Malzeme Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "71"
  },
  {
    "code": "712",
    "name": "Direkt İlk Madde ve Malzeme Fiyat Farkı",
    "type": "SUB",
    "parentCode": "71"
  },
  {
    "code": "713",
    "name": "Direkt İlk Madde ve Malzeme Miktar Farkı",
    "type": "SUB",
    "parentCode": "71"
  },
  {
    "code": "72",
    "name": "Direkt İşçilik Giderleri",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "720",
    "name": "Direkt İşçilik Giderleri",
    "type": "SUB",
    "parentCode": "72"
  },
  {
    "code": "721",
    "name": "Direkt İşçilik Giderleri Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "72"
  },
  {
    "code": "722",
    "name": "Direkt İşçilik Ücret Farkları",
    "type": "SUB",
    "parentCode": "72"
  },
  {
    "code": "723",
    "name": "Direkt İşçilik Süre (Zaman) Farkları",
    "type": "SUB",
    "parentCode": "72"
  },
  {
    "code": "73",
    "name": "Genel Üretim Giderleri",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "730",
    "name": "Genel Üretim Giderleri",
    "type": "SUB",
    "parentCode": "73"
  },
  {
    "code": "731",
    "name": "Genel Üretim Giderleri Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "73"
  },
  {
    "code": "732",
    "name": "Genel Üretim Giderleri Bütçe Farkları",
    "type": "SUB",
    "parentCode": "73"
  },
  {
    "code": "733",
    "name": "Genel Üretim Giderleri Verimlilik Farkları",
    "type": "SUB",
    "parentCode": "73"
  },
  {
    "code": "734",
    "name": "Genel Üretim Giderleri Kapasite Farkları",
    "type": "SUB",
    "parentCode": "73"
  },
  {
    "code": "74",
    "name": "Hizmet Üretim Maliyeti",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "740",
    "name": "Hizmet Üretim Maliyeti",
    "type": "SUB",
    "parentCode": "74"
  },
  {
    "code": "741",
    "name": "Hizmet Üretim Maliyeti Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "74"
  },
  {
    "code": "742",
    "name": "Hizmet Üretim Maliyeti Fark Hesapları",
    "type": "SUB",
    "parentCode": "74"
  },
  {
    "code": "75",
    "name": "Araştırma ve Geliştirme Giderleri",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "750",
    "name": "Araştırma ve Geliştirme Giderleri",
    "type": "SUB",
    "parentCode": "75"
  },
  {
    "code": "751",
    "name": "Araştırma ve Geliştirme Giderleri Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "75"
  },
  {
    "code": "752",
    "name": "Araştırma ve Geliştirme Gider Farkları",
    "type": "SUB",
    "parentCode": "75"
  },
  {
    "code": "76",
    "name": "Pazarlama, Satış ve Dağıtım Giderleri",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "760",
    "name": "Pazarlama ,Satış ve Dağıtım Giderleri",
    "type": "SUB",
    "parentCode": "76"
  },
  {
    "code": "761",
    "name": "Pazarlama ,Satış ve Dağıtım Giderleri Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "76"
  },
  {
    "code": "762",
    "name": "Pazarlama ,Satış ve Dağıtım Giderleri Fark Hesabı",
    "type": "SUB",
    "parentCode": "76"
  },
  {
    "code": "77",
    "name": "Genel Yönetim Giderleri",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "770",
    "name": "Genel Yönetim Giderleri",
    "type": "SUB",
    "parentCode": "77"
  },
  {
    "code": "771",
    "name": "Genel Yönetim Giderleri Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "77"
  },
  {
    "code": "772",
    "name": "Genel Yönetim Gider Farkları Hesabı",
    "type": "SUB",
    "parentCode": "77"
  },
  {
    "code": "78",
    "name": "Finansman Giderleri",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "780",
    "name": "Finansman Giderleri",
    "type": "SUB",
    "parentCode": "78"
  },
  {
    "code": "781",
    "name": "Finansman Giderleri Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "78"
  },
  {
    "code": "782",
    "name": "Finansman Giderleri Fark Hesabı",
    "type": "SUB",
    "parentCode": "78"
  },
  {
    "code": "79",
    "name": "Gider Çeşitleri",
    "type": "MAIN",
    "parentCode": "7"
  },
  {
    "code": "790",
    "name": "İlk Madde ve Malzeme Giderleri",
    "type": "SUB",
    "parentCode": "79"
  },
  {
    "code": "791",
    "name": "İşçi Ücret ve Giderleri",
    "type": "SUB",
    "parentCode": "79"
  },
  {
    "code": "792",
    "name": "Memur Ücret ve Giderleri",
    "type": "SUB",
    "parentCode": "79"
  },
  {
    "code": "793",
    "name": "Dışarıdan Sağlanan Fayda ve Hizmetler",
    "type": "SUB",
    "parentCode": "79"
  },
  {
    "code": "794",
    "name": "Çeşitli Giderler",
    "type": "SUB",
    "parentCode": "79"
  },
  {
    "code": "795",
    "name": "Vergi, Resim ve Harçlar",
    "type": "SUB",
    "parentCode": "79"
  },
  {
    "code": "796",
    "name": "Amortismanlar ve Tükenme Payları",
    "type": "SUB",
    "parentCode": "79"
  },
  {
    "code": "797",
    "name": "Finansman Giderleri",
    "type": "SUB",
    "parentCode": "79"
  },
  {
    "code": "798",
    "name": "Gider Çeşitleri Yansıtma Hesabı",
    "type": "SUB",
    "parentCode": "79"
  },
  {
    "code": "799",
    "name": "Üretim Maliyet Hesabı",
    "type": "SUB",
    "parentCode": "79"
  }
];
