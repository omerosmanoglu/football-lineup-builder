/*
Bu adreslere gir
Fenerbahçe: https://www.transfermarkt.com.tr/fenerbahce-sk/kadernaechstesaison/verein/36/
Beşiktaş: https://www.transfermarkt.com.tr/besiktas-istanbul/kadernaechstesaison/verein/114
Galatasaray: https://www.transfermarkt.com.tr/galatasaray-istanbul/kadernaechstesaison/verein/141
Trabzon: https://www.transfermarkt.com.tr/trabzonspor/kadernaechstesaison/verein/449

Console'da aşağıdaki kodu çalıştır. Bu, kadro verilerini JSON formatında indirir.
*/
(() => {
  const rows = document.querySelectorAll("table.items tbody tr");

  const data = [...rows].map(row => {
    const playerCell = row.querySelector("td.posrela");

    if (!playerCell) return null;

    // Oyuncu adı
    const name =
      playerCell.querySelector(".hauptlink a")?.textContent.trim() || "";

    // Pozisyon
    const positionRow = playerCell.querySelectorAll("tr td");
    const positions =
      positionRow[positionRow.length - 1]?.textContent.trim() || "";

    // Uyruklar
    const nationalityImgs = row.querySelectorAll(
      "td.zentriert img.flaggenrahmen"
    );

    const uyruk = [...nationalityImgs]
      .map(img => img.getAttribute("title")?.trim())
      .filter(Boolean)
      .join(" / ");

    // Piyasa değeri
    let degerText =
      row.querySelector("td.rechts.hauptlink")?.innerText.trim() || "";

    let deger = 0;

    if (degerText.includes("mil.")) {
      deger = parseFloat(degerText.replace(" mil. €", "").replace(",", "."));
    } else if (degerText.includes("bin")) {
      deger =
        parseFloat(degerText.replace(" bin €", "").replace(",", ".")) / 1000;
    }

    return {
      name,
      positions,
      uyruk,
      deger,
      sakat: false,
      kadrodisi: false
    };
  }).filter(Boolean);

  // JSON indir
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "kadro.json";
  a.click();

  console.log(data);
})();