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
            words_info = []
            
            # Extract word attributes from Stanza's parses
            for w in sentence.words:
                words_info.append({
                    "id": w.id,
                    "text": w.text,
                    "lemma": w.lemma.lower() if w.lemma else w.text.lower(),
                    "pos": w.upos,
                    "deprel": w.deprel,
                    "head": w.head
                })
                
            # Filter auxiliary stop words and punctuation
            filtered_info = [w for w in words_info if w["lemma"] not in self.stop_words and w["pos"] != "PUNCT"]
            if not filtered_info:
                continue
                
            # Perform reordering to SOV (Subject-Object-Verb):
            # Sort words based on syntactic role
            subjects = [repr_w for repr_w in filtered_info if "nsubj" in repr_w["deprel"]]
            objects = [repr_w for repr_w in filtered_info if repr_w["deprel"] in ("obj", "obl", "iobj")]
            verbs = [repr_w for repr_w in filtered_info if repr_w["pos"] in ("VERB", "AUX") or repr_w["deprel"] == "root"]
            questions = [repr_w for repr_w in filtered_info if repr_w["lemma"] in ("what", "where", "why", "who", "how", "when", "which", "whose")]
            
            # Others: adjectives, conjunctions, modifiers, etc.
            categorized_ids = set(w["id"] for w in subjects + objects + verbs + questions)
            others = [repr_w for repr_w in filtered_info if repr_w["id"] not in categorized_ids]
            
            # Build the ISL order: Subject + Object + Others + Verb + Question
            isl_ordered_info = []
            isl_ordered_info.extend(subjects)
            isl_ordered_info.extend(objects)
            isl_ordered_info.extend(others)
            isl_ordered_info.extend(verbs)
            isl_ordered_info.extend(questions)
            
            # Deduplicate by word ID to preserve structure
            seen_ids = set()
            unique_isl_info = []
            for w in isl_ordered_info:
                if w["id"] not in seen_ids:
                    unique_isl_info.append(w)
                    seen_ids.add(w["id"])
                    
            # Fallback block if any word didn't map (just in case)
            for w in filtered_info:
                if w["id"] not in seen_ids:
                    unique_isl_info.append(w)
            
            # Process word animation match / spelling
            for w in unique_isl_info:
                lemma = w["lemma"]
                if lemma in self.valid_words:
                    final_sequence.append(lemma)
                else:
                    # Fingerspelling sequence
                    for letter in lemma:
                        if letter.isalnum():
                            final_sequence.append(letter.upper())
                            
        return final_sequence
