# 本機素材包（Local asset pack）

呢個資料夾入面嘅檔案**唔會**上傳到 GitHub（見 `.gitignore`）。

想用自己嘅圖片取代內置像素美術：

1. 將 PNG 放入呢個資料夾。
2. 建立 `sprites.json`，將 sprite key 對應到檔名，例如：

```json
{
  "player_0": "merchant_a.png",
  "player_1": "merchant_b.png",
  "unit_swordsman_0": "swordsman_a.png",
  "unit_swordsman_1": "swordsman_b.png"
}
```

3. 用本機伺服器開遊戲（例如 `npx serve .`），開 console 會見到「本機素材包已載入」。

常用 key：`player_0/1`、`unit_<兵種id>_0/1`（兵種 id 見 `src/data.js`）、`peddler_0/1`、`tile_0..3`、`deco_0..2`。

圖片會以原尺寸 × 3 倍顯示，建議 16×20 像素左右。

⚠️ 請只放你有權使用嘅素材。巨商（Gersang）原版遊戲素材屬 Joyon Entertainment 所有，唔好放入公開 repo。
