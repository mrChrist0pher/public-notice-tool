# Public Notice Tool — Quick Guide

[Open the Public Notice Tool](https://gisintra.bouldercolorado.gov/agswebsites/plan/PublicNoticeWebApp/) and sign in with your City Portal account.

**FBC mailings are not supported yet. Continue using the existing FBC mailing process until support is available and confirmed.**

## 1. Find the case

Enter the case number and press **Enter** or click the magnifying glass. Choose the matching result if needed.

## 2. Confirm the subject location and export the map

Check the gray **Subject Area**. If correct, click **Generate location map PDF** and open the downloaded PDF.

🛑 **TEST THE QR CODE. Scan it and confirm it opens the correct case before using the PDF.**

If the subject area is wrong, stop and contact the case manager. The case manager may need P&DS GIS to correct parcels mistakenly retained in the History layer.

## 3. Select the mailing area

Choose the required method, then click **Run selection**:

- **300 or 600 feet:** selects owner parcels within that distance of the case geometry.
- **Adjacent:** starts with a small 2-foot buffer. Add across-street parcels as appropriate.
- **Custom:** enter a radius greater than zero in feet, then click **Run selection**. Decimals are allowed. After changing the distance, run again before exporting.

To adjust the selection, choose **Add parcels** or **Remove parcels**, click **Pick parcels on map**, and click the parcels. Click **Finish adjusting** when done.

## 4. Generate the mailing list

Check the selection, then click **Generate mailing list** to download the cleaned CSV. Cleanup combines matching owner/address records, keeps distinct owners separate, and excludes records with both mailing address lines blank.

## Save and send

Your Downloads folder will contain:

- **CASE_VM.pdf** — location map.
- **CASE_ML.csv** — cleaned owner mailing list.

After generating a non-empty list, click **Prepare vendor email**. It opens a draft in your default email app, with the case number, cleaned destination count and selection method filled in. Enter the vendor in To if blank. Attach the downloaded CSV and the required notice/map files; add the mailing date and billing/project details, review, then send. Nothing is attached or sent automatically. If no draft opens, check your default mail-app settings.

Save the files with the case records and follow the usual EnerGov handoff.

**Starting a new case search clears the previous notice work.**

*P&DS GIS · Owners-only workflow · Updated November 17, 2026*

