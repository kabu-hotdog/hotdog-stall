# AIにポスターを作らせるワークフロー — ディープリサーチ（2026-09-23）

問い：
1. 「AIにテーマごとのリサーチをさせてから、Claudeに作らせる」は正しかったか？
2. 「Claudeが作り、人間が最終手直し」は本当に正しいか？
3. Opusで計画し、Sonnetで大量に試作して品質を安定させるにはどうするか？

hotdog-stall（v1〜v10、20回以上のQA）と gift（ぜんざい・カレー 9案）の実績と、下記の研究を突き合わせた結論。

---

## 結論（先に）

| 思い込み | 判定 | 根拠の要点 |
|---|---|---|
| リサーチしてから作る | **半分正しい** | ジャンルの「記号・キーワード」を調べるのは効く。**完成例（画像・構図）を見せてから作らせると固定化して案が貧しくなる** |
| Claudeが作る→人間が最後に手直し | **正しいが、それだけだと足りない** | 最後だけ人間が入ると「アンカリング」で手直しが浅くなり、方向性の多様性も持ち主意識も落ちる。**人間は「方向を選ぶ」段階にも入る**べき |
| 作ったら見て直す | **正しい（最重要）** | レンダリングして目で見るフィードバックは、コードだけ見て直すより一貫して強い |
| 同じ指示でSonnetを大量に回す | **このままだと失敗する** | 同じAI・同じ指示からは似た案しか出ない（均質化）。**1体ごとに別のテーマ・別の骨格・別の制約**を渡すと多様性が戻る |

---

## 1. リサーチの「渡し方」が品質を決める

- **完成例を見せると固定化する**：AI画像をインスピレーションに使ったデザイナーは、何も見ない群よりアイデア数・多様性・独創性がすべて低かった（Wadinambiarachchi et al., CHI 2024, N=60）。「最初に見た例」への固定が、AIの出力への固定にすり替わるだけ。
- **キーワードに分解すると発想が増える**：参考画像から要素をキーワードで抜き出して組み替える方式は、アイデア数と創造性の自己評価を上げた（CreativeConnect, CHI 2024）。
- **このプロジェクトでの実証**：選挙ポスター（ひらがな名・たすき・公約・党名バッジ）、号外、WANTED などは「ジャンルの記号を3つ以上入れる」方式で高評価。一方 gift では参考フライヤーの構図をなぞる失敗があり、「references/だけに頼らない」ルールが後から入った。

**→ ルール**：リサーチの成果物は「画像」ではなく**記号リスト（キーワード）と情報の言い換え表**にする。完成例の画像を実装担当（Sonnet）に渡さない。

## 2. 人間が入るべき場所は「最後」だけではない

- **アンカリング**：編集者の立場に置かれた人は、渡された下書きに強く引っ張られて手直しが浅くなる。下書きがAI製でも人間製でも同じ（From Planning to Revision, DIS 2026）。
- **AI主導 vs 人間主導**：AIが主導すると案の質は上がるが、多様性と持ち主意識が下がる。人間が方向を考える方式は、質を上げつつ多様性と持ち主意識も保った（Partnering with Generative AI, CHI 2026, N=486）。
- **このプロジェクトでの実証**：ユーザーの手直し（いいね・コメントアイコンなど）は「唯一の正」として保護している。手直しそのものは価値が高い。

**→ ルール**：人間の出番は2回。①**方向を選ぶ**（テーマ案リストやサムネイルから選ぶ。数分で済む）、②**最終手直し**（PowerPointで直接）。①を飛ばすと、AIの最初の案に全員が引っ張られる。

## 3. 「見て直す」ループは必須

- レンダリング結果を見て直す方式は、コードだけの方式より一貫して良い（Seeing is Improving, CVPR 2026 / Vision-Guided Iterative Refinement 2026）。
- 自分で批評して直すだけでも平均約20%改善（Self-Refine）。
- 論文ポスター自動生成 PosterGen は、役割を分けて（内容整理・レイアウト・配色・フォント）原則を明文化し、美しさの評価で人間のデザインに並んだ（4.43 対 4.27）。ただし総合では人間がわずかに上。

**→ ルール**：既存の `export-slides.ps1` → PNG → 目視QA を、Sonnetの各試作にも必須で課す。QAの観点はチェックリストとして明文化して渡す（「なんとなく見る」をさせない）。

## 4. 大量試作で「均質化」を防ぐ

- AIのアイデアを使うと個々の作品は良くなるが、作品どうしが似る（Doshi & Hauser, Science Advances 2024）。
- この均質化はAIの限界ではなく「全員に同じ指示を渡す運用」のせい。10種類の違うペルソナで指示を変えたら、多様性は人間だけの場合と同等以上に戻った（arXiv 2504.13868）。
- モデルは放っておくと「無難な真ん中」を出す（Anthropic「distributional convergence」）。避けたい既定値（三段構成、白地、小さい写真など）を**名指しで禁止**するとすぐ効く。

**→ ルール**：Sonnet 1体ごとに「テーマ・骨格・主役の扱い・情報の言い換え先・禁止事項」が**全部違う**ブリーフを渡す。

---

## 推奨ワークフロー（Opus計画 × Sonnet大量試作）

```
[Opus] ① リサーチ：ジャンルの記号・定石をキーワード化（画像は渡さない）
[Opus] ② ブリーフ作成：案ごとに独立したブリーフをN本（骨格の重複チェック済み）
[人間] ③ 方向選び：ブリーフ一覧から「作る案」を選ぶ／足す／消す    ← 数分
[Sonnet×N] ④ 並列試作：1体1案。生成→PNG→QAチェックリスト→修正を収束まで
[Opus] ⑤ 講評：全PNGを並べて採点、上位を選び、修正指示を書く
[Sonnet] ⑥ 修正
[人間] ⑦ 最終手直し（PowerPoint）→ 承認 → approve-flyer.ps1 + commit
```

### ブリーフに必ず書くもの（Sonnetが単体で実行できる粒度）
1. 出力先ファイル名・スライドサイズ・使う素材（**ファイル名で指定**。インデックス参照禁止）
2. テーマと、入れるジャンル記号3つ以上
3. 情報の言い換え表（例：メニュー→公約）
4. 骨格：主役の配置・大きさ・回転、文字の階層
5. 配色3色（比率70:25:5）とフォント（`poster-knowhow.md` §7.5から指定）
6. 禁止事項（`poster-prompt.md` 根本原則＋この案固有のもの）
7. QAチェックリスト（`poster-knowhow.md` §1）と完了条件
8. 手動編集保護：`safeWriteFile()` 必須、既存pptxを上書きしない

### gift プロジェクトへの適用
gift の `flyer-prompt.md` 制作フロー3〜4（テーマ発想→骨格の重複チェック）はこのリサーチと一致している。足りないのは ③（人間の方向選び）と、Sonnetへのブリーフ分割。

---

## 出典
- Wadinambiarachchi et al. "The Effects of Generative AI on Design Fixation and Divergent Thinking", CHI 2024 — https://arxiv.org/pdf/2403.11164
- Choi et al. "CreativeConnect: Supporting Reference Recombination for Graphic Design Ideation with Generative AI" — https://arxiv.org/abs/2312.11949
- Doshi & Hauser "Generative AI enhances individual creativity but reduces the collective diversity of novel content", Science Advances 2024 — https://www.science.org/doi/10.1126/sciadv.adn5290
- "Diverse AI Personas Can Mitigate the Homogenization Effect in Human-AI Collaborative Ideation" — https://arxiv.org/abs/2504.13868
- "Partnering with Generative AI: Experimental Evaluation of Human-Led and Model-Led Interaction in Human-AI Co-Creation", CHI 2026 — https://arxiv.org/pdf/2510.23324
- "From Planning to Revision: How AI Writing Support at Different Stages Alters Ownership", DIS 2026 — https://arxiv.org/html/2604.11009
- "Seeing is Improving: Visual Feedback for Iterative Text Layout Refinement", CVPR 2026 — https://arxiv.org/pdf/2603.22187
- "Vision-Guided Iterative Refinement for Frontend Code Generation" — https://arxiv.org/html/2604.05839
- "PosterGen: Aesthetic-Aware Paper-to-Poster Generation via Multi-Agent LLMs" — https://www.alphaxiv.org/abs/2508.17188
- Anthropic "Improving frontend design through Skills" — https://claude.com/blog/improving-frontend-design-through-skills
