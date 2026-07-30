import os
import stanza

# Word list dictionary path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
WORDS_TXT_PATH = os.path.join(CURRENT_DIR, "words.txt")

# Set up Stanza Resources
RESOURCES_DIR = os.path.join(CURRENT_DIR, "stanza_resources")

class ISLTranslator:
    def __init__(self):
        # Initialize Stanza pipeline (English)
        # Downloader will download files to stanza_resources if missing
        print("[ISL Translator] Initializing Stanza NLP Pipeline...")
        stanza.download('en', model_dir=RESOURCES_DIR, processors='tokenize,pos,lemma,depparse')
        self.nlp = stanza.Pipeline('en', model_dir=RESOURCES_DIR, processors='tokenize,pos,lemma,depparse')
        print("[ISL Translator] Stanza NLP Pipeline initialized.")
        
        # Load dictionary words
        self.valid_words = set()
        if os.path.exists(WORDS_TXT_PATH):
            with open(WORDS_TXT_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    w = line.strip().lower()
                    if w:
                        self.valid_words.add(w)
        print(f"[ISL Translator] Loaded {len(self.valid_words)} valid ISL words from dictionary.")

        self.stop_words = set([
            "am", "are", "is", "was", "were", "be", "being", "been",
            "have", "has", "had", "does", "did", "could", "should",
            "would", "can", "shall", "will", "may", "might", "must", "let",
            "the", "a", "an"
        ])

    def translate(self, text: str) -> list[str]:
        if not text.strip():
            return []
            
        doc = self.nlp(text)
        final_sequence = []
        
        for sentence in doc.sentences:
            for w in sentence.words:
                if w.upos == "PUNCT":
                    continue
                    
                lemma = w.lemma.lower() if w.lemma else w.text.lower()
                
                if lemma in self.valid_words:
                    final_sequence.append(lemma)
                else:
                    raw_text = w.text.lower()
                    if raw_text in self.valid_words:
                        final_sequence.append(raw_text)
                    # Untrained words are skipped entirely
                                
        return final_sequence
