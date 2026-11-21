# 巨商 Survivors（Gersang Survivors）

以《巨商》為藍本嘅生存類（Vampire Survivors-like）瀏覽器遊戲。角色、轉職路線、合成配方、怪物、地圖、掉落同裝備全部嚟自[巨商全能百科](../)嘅 `data.json`，再改編成適合 Survivors 玩法嘅數值。

**直接玩：** https://gersang-wiki.github.io/survivors/

## 玩法

- 揀主角：**曹鐵西**（獵人 → 神弓）或 **李明花**（大商人 → 砲手）。
- 每局 10 分鐘：WASD / 方向鍵移動（手機拖動畫面），攻擊全自動。第 5 分鐘出中首領，第 10 分鐘出地圖首領，打低就平定該地圖、開放下一張。
- 局內升級三選一：傭兵攻擊 / 攻速 / 巨商原版技能強化，同主角被動。
- 局完後經驗、銀兩、戰利品全部帶返營地（撤退都保留）。

## 營地（長期養成）

| 系統 | 內容 |
| --- | --- |
| 傭兵 | 永久等級（用巨商原版經驗表），8 格裝備（武器、盔甲、頭盔、手套、腰帶、鞋子、戒指、飾物），兵器類型限制照原作 |
| 轉職 | 原作路線，例如 弓手 →(Lv40) 李舜臣 →(Lv90) 龜甲車 →(Lv100) 真龜甲車 |
| 合成所 | 原作配方，例如 石爺爺 + 四不像 + 鹿 → 巨山；巨山 + 白龍 + 鐮刀者 → 混沌 / 雷龍 |
| 訓練所 | 朝鮮訓練所 8 種基礎傭兵 |
| 收服 | 打怪有機會收服怪物傭兵（鹿、九尾狐、白虎、石爺爺…） |
| 市場 / 倉庫 | 村莊武器店、轉職合成材料；賣戰利品 |

目前收錄朝鮮 54 隻傭兵、12 張朝鮮地圖。需要其他國傭兵嘅傳說合成（神弓朱蒙、公子崔茂宣、道士洪吉童…）會顯示「未開放」，之後版本加入。

## 美術

所有角色都係程式生成嘅原創像素圖，按角色身份、兵器、屬性設計（例如李舜臣嘅水軍盔甲同弓、龜甲車嘅龜船車、石爺爺嘅石像），**冇使用巨商原作素材**。可以用 `assets-local/` 喺自己部電腦載入自己嘅圖片（唔會上傳），詳見 [assets-local/README.md](assets-local/README.md)。

## 開發

純 HTML5 Canvas + 原生 JavaScript，冇 build 步驟。

```
python -m http.server    # 喺 repo 根目錄，開 http://localhost:8000/survivors/
python survivors/tools/extract.py data.json survivors/src/gsdata.js   # wiki 資料更新後重新生成
```

- `src/gsdata.js`：由 `tools/extract.py` 從 wiki 生成（唔好手改）
- `src/rules.js`：巨商數值 → 遊戲數值嘅轉換、轉職/合成/裝備規則
- `src/main.js`：戰鬥、局內升級、繪圖
- `src/camp.js`：營地介面同存檔（localStorage）
- `src/render.js`：像素美術生成

非官方同人作品，與 Joyon Entertainment 無關；「巨商」為其權利人所有。
