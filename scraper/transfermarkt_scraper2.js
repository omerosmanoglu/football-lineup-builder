(() => {

    console.clear();

    console.log("======================================");
    console.log("Transfermarkt Kadro JSON Çıkarıcı");
    console.log("======================================");

    const url = window.location.href;

    // -----------------------------------------------------
    // TAKIM ADI
    // -----------------------------------------------------

    let takimAdi = "kadro";

    if (url.includes("/verein/36")) {
        takimAdi = "fenerbahce";
    }
    else if (url.includes("/verein/114")) {
        takimAdi = "besiktas";
    }
    else if (url.includes("/verein/141")) {
        takimAdi = "galatasaray";
    }
    else if (url.includes("/verein/449")) {
        takimAdi = "trabzonspor";
    }

    console.log("Takım:", takimAdi);
    console.log("URL:", url);


    // -----------------------------------------------------
    // ANA TABLO
    // -----------------------------------------------------

    const table = document.querySelector("table.items");

    if (!table) {

        console.error("Kadro tablosu bulunamadı!");

        alert(
            "Transfermarkt kadro tablosu bulunamadı.\n\n" +
            "Sayfanın tamamen yüklenmesini bekleyip tekrar deneyin."
        );

        return;
    }


    // -----------------------------------------------------
    // SADECE ANA TABLONUN SATIRLARI
    // -----------------------------------------------------

    const rows =
        table.querySelectorAll(":scope > tbody > tr");

    console.log(
        "Bulunan ana satır sayısı:",
        rows.length
    );


    // -----------------------------------------------------
    // OYUNCULARI AL
    // -----------------------------------------------------

    const data = [...rows]
        .map((row) => {

            const playerCell =
                row.querySelector("td.posrela");

            if (!playerCell) {
                return null;
            }


            // -------------------------------------------------
            // OYUNCU ADI
            // -------------------------------------------------

            const name =
                playerCell
                    .querySelector("td.hauptlink a")
                    ?.textContent
                    .trim() || "";

            if (!name) {
                return null;
            }


            // -------------------------------------------------
            // POZİSYON
            // -------------------------------------------------

            const positionElement =
                playerCell.querySelector(
                    "table.inline-table tr:nth-child(2) td"
                );

            const positions =
                positionElement
                    ?.textContent
                    .trim() || "";


            // -------------------------------------------------
            // DOĞUM YILI
            // -------------------------------------------------

            const centeredCells =
                row.querySelectorAll("td.zentriert");

            let dogumYil = 0;

            /*
                Örnek:

                30 Eyl 1996 (29)

                Buradan:

                1996

                alınır.
            */

            for (const cell of centeredCells) {

                const text =
                    cell.textContent.trim();

                const match =
                    text.match(/\b(19|20)\d{2}\b/);

                if (match) {

                    dogumYil =
                        Number(match[0]);

                    break;
                }
            }


            // -------------------------------------------------
            // UYRUK
            // -------------------------------------------------

            const nationalityImgs =
                row.querySelectorAll(
                    "img.flaggenrahmen"
                );

            const uyruk =
                [...nationalityImgs]
                    .map(img =>
                        img.getAttribute("title")?.trim()
                    )
                    .filter(Boolean)
                    .join(" / ");


            // -------------------------------------------------
            // PİYASA DEĞERİ
            // -------------------------------------------------

            const marketValueElement =
                row.querySelector(
                    "td.rechts.hauptlink"
                );

            const degerText =
                marketValueElement
                    ?.innerText
                    .trim() || "";

            let deger = 0;


            if (degerText.includes("mil.")) {

                const value =
                    degerText
                        .replace("mil. €", "")
                        .replace(",", ".")
                        .trim();

                deger =
                    parseFloat(value);

            }
            else if (degerText.includes("bin")) {

                const value =
                    degerText
                        .replace("bin €", "")
                        .replace(",", ".")
                        .trim();

                deger =
                    parseFloat(value) / 1000;
            }


            if (isNaN(deger)) {
                deger = 0;
            }


            // -------------------------------------------------
            // OYUNCU
            // -------------------------------------------------

            return {

                name: name,

                dogumYil: dogumYil,

                positions: positions,

                uyruk: uyruk,

                deger: deger,

                sakat: false,

                kadrodisi: false

            };

        })
        .filter(Boolean);


    // -----------------------------------------------------
    // KONTROL
    // -----------------------------------------------------

    console.log("======================================");

    console.log(
        "Bulunan oyuncu:",
        data.length
    );

    console.log("======================================");


    if (data.length === 0) {

        console.error(
            "Hiç oyuncu bulunamadı!"
        );

        alert(
            "Oyuncu bulunamadı!"
        );

        return;
    }


    // -----------------------------------------------------
    // KONSOL
    // -----------------------------------------------------

    console.table(data);


    // -----------------------------------------------------
    // JSON
    // -----------------------------------------------------

    const json =
        JSON.stringify(
            data,
            null,
            2
        );


    console.log(
        "JSON boyutu:",
        json.length,
        "karakter"
    );


    // -----------------------------------------------------
    // BLOB
    // -----------------------------------------------------

    const blob =
        new Blob(
            [json],
            {
                type: "application/json"
            }
        );


    console.log(
        "Blob boyutu:",
        blob.size,
        "byte"
    );


    // -----------------------------------------------------
    // ESKİ İNDİRME BUTONU VARSA SİL
    // -----------------------------------------------------

    const eski =
        document.getElementById(
            "tm-json-download-container"
        );

    if (eski) {
        eski.remove();
    }


    // -----------------------------------------------------
    // DOWNLOAD URL
    // -----------------------------------------------------

    const downloadUrl =
        URL.createObjectURL(blob);


    // -----------------------------------------------------
    // EKRANA İNDİRME ALANI
    // -----------------------------------------------------

    const container =
        document.createElement("div");

    container.id =
        "tm-json-download-container";

    container.style.position =
        "fixed";

    container.style.top =
        "100px";

    container.style.right =
        "30px";

    container.style.zIndex =
        "999999999";

    container.style.background =
        "#ffffff";

    container.style.border =
        "2px solid #222";

    container.style.borderRadius =
        "10px";

    container.style.padding =
        "15px";

    container.style.boxShadow =
        "0 5px 30px rgba(0,0,0,.4)";


    // -----------------------------------------------------
    // BAŞLIK
    // -----------------------------------------------------

    const title =
        document.createElement("div");

    title.innerHTML =
        "<b>Transfermarkt JSON hazır</b>";

    title.style.marginBottom =
        "10px";


    // -----------------------------------------------------
    // BİLGİ
    // -----------------------------------------------------

    const info =
        document.createElement("div");

    info.textContent =
        data.length +
        " oyuncu • " +
        blob.size +
        " byte";

    info.style.marginBottom =
        "10px";

    info.style.fontSize =
        "13px";


    // -----------------------------------------------------
    // İNDİR BUTONU
    // -----------------------------------------------------

    const button =
        document.createElement("a");

    button.href =
        downloadUrl;

    button.download =
        takimAdi + "_kadro.json";

    button.textContent =
        "⬇ " +
        takimAdi +
        "_kadro.json indir";

    button.style.display =
        "inline-block";

    button.style.padding =
        "10px 15px";

    button.style.background =
        "#198754";

    button.style.color =
        "#ffffff";

    button.style.textDecoration =
        "none";

    button.style.borderRadius =
        "6px";

    button.style.fontWeight =
        "bold";

    button.style.cursor =
        "pointer";


    // -----------------------------------------------------
    // KAPAT
    // -----------------------------------------------------

    const close =
        document.createElement("button");

    close.textContent =
        "×";

    close.style.marginLeft =
        "10px";

    close.style.cursor =
        "pointer";

    close.style.border =
        "0";

    close.style.background =
        "transparent";

    close.style.fontSize =
        "20px";

    close.onclick = () => {

        URL.revokeObjectURL(downloadUrl);

        container.remove();

    };


    // -----------------------------------------------------
    // DOM'A EKLE
    // -----------------------------------------------------

    container.appendChild(title);

    container.appendChild(info);

    container.appendChild(button);

    container.appendChild(close);

    document.body.appendChild(container);


    // -----------------------------------------------------
    // OTOMATİK İNDİRMEYİ DENE
    // -----------------------------------------------------

    /*
        Burada URL'yi hemen revoke etmiyoruz.

        Önce gerçek download işleminin başlamasına
        izin veriyoruz.
    */

    setTimeout(() => {

        button.click();

        console.log(
            "İndirme başlatıldı:",
            takimAdi + "_kadro.json"
        );

    }, 300);


    // -----------------------------------------------------
    // SONUÇ
    // -----------------------------------------------------

    console.log("======================================");
    console.log("BAŞARILI");
    console.log("======================================");

    console.log(
        "Dosya:",
        takimAdi + "_kadro.json"
    );

    console.log(
        "Oyuncu:",
        data.length
    );

    console.log(
        "JSON:",
        json.length,
        "karakter"
    );

    console.log(
        "Blob:",
        blob.size,
        "byte"
    );

    console.log("======================================");

})();