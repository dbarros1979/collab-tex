# ✨ Collab-Tex  
_Redesigning Academic LaTeX Collaboration_

---

## 🚀 What is Collab-Tex?

**Collab-Tex** is a collaborative platform for reviewing **LaTeX documents**.  
Here, reviewers and authors can **edit**, **suggest improvements**, and **track PDFs in real time** — all without installing any software.

📌 In other words: an open and simple alternative to Overleaf.  

---

## 🔄 How it works

1. **Edit directly in the browser**  
   - Click any `.tex` file → **Edit** → propose your changes.  
   - Create a **Pull Request** to submit your suggestions.

2. **Automatic PDF preview**  
   - Every change triggers a **GitHub Actions workflow** that recompiles the PDF.  
   - The updated document is available via **GitHub Pages**:  
     👉 [View the latest version](https://YOUR-USERNAME.github.io/collab-tex/example.pdf)

3. **Suggest improvements**  
   - Use PR comments to discuss changes.  
   - Work in an **open, collaborative, and versioned environment**.

---

## 🛠️ Repository Structure

    ```
    collab-tex/
    │── docs/               # Compiled PDFs (published via Pages)
    │── figures/            # Images used in the documents
    │── references.bib      # Bibliography file
    │── example.tex         # Example LaTeX document
    │── .github/workflows/  # Compilation workflow
    ````

---

## 👩‍💻 For Reviewers

- No local setup required!  
- Edit files **directly on GitHub**.  
- The compiled PDF is always available via the Pages link.

If you prefer to compile locally:
```bash
latexmk -pdf example.tex
````

---

## 📦 Local Setup (Optional)

If you want to **compile LaTeX documents locally**, we recommend installing a TeX distribution **before any editor**. This ensures compatibility with PDF generation, bibliography, and cross-references.

### Recommended Setup

* **TeX distribution:**

  * [TeX Live](https://www.tug.org/texlive/) — cross-platform, includes `pdflatex`, `bibtex`, and other essential tools.

    * On **Ubuntu/Debian**:

      ```bash
      sudo apt-get update
      sudo apt-get install texlive-full
      ```
    * On **macOS**: [MacTeX](https://www.tug.org/mactex/)
    * On **Windows**: [TeX Live for Windows](https://www.tug.org/texlive/windows.html)

* **Editor:**
  Any LaTeX editor will work, but we suggest **VSCode** with the [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) extension.

  * Features: automatic build, PDF preview, syntax highlighting, and error diagnostics.

> ⚠️ **Tip:** Install TeX Live **before** any editor/plugin to avoid compilation errors.

---

## 🤝 Contributing

* Open an **Issue** to discuss ideas.
* Submit a **Pull Request** to suggest text or structural changes.
* Every contribution counts — from fixing a typo to reorganizing a section.

---

## 🌟 Why Collab-Tex?

Because science thrives in community.
Here, every contribution matters — whether it’s a small tweak or a major revision.

---

📍 *Maintained by [dbarros1979](https://github.com/dbarros1979)*
💡 Inspired by the idea of making academic review more **accessible, transparent, and collaborative**.
