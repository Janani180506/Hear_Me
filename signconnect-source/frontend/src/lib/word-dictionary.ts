/**
 * Local English Word Dictionary and Prefix Suggestion Engine for SignConnect.
 * Used for instant prefix-based word suggestions in Sign-to-Text assistive flow.
 * Engineered for maximum safety against undefined/null inputs and malformed entries.
 */

// Core assistive & high-frequency communication words prioritized in suggestions
const HIGH_PRIORITY_WORDS: string[] = [
  // Greetings & Civilities
  "HELLO", "HELP", "HELD", "HELM", "HELMET", "GOOD", "GOODBYE", "MORNING", "EVENING", "NIGHT",
  "WELCOME", "PLEASE", "THANK", "THANKS", "SORRY", "EXCUSE", "PARDON", "HI", "HEY",
  
  // Essentials & Emergency
  "WATER", "WANT", "WAIT", "WALK", "WASHROOM", "TOILET", "FOOD", "FEED", "MEDICINE", "MEDICAL",
  "DOCTOR", "HOSPITAL", "NURSE", "POLICE", "AMBULANCE", "PAIN", "HURT", "SICK", "FEVER", "EMERGENCY",
  "DANGER", "HELP", "NEED", "NEEDS", "NEEDLE", "HUNGRY", "THIRSTY", "REST", "SLEEP", "TIRED",
  
  // Questions
  "WHAT", "WHERE", "WHEN", "WHY", "HOW", "WHO", "WHICH", "WHOSE",
  
  // Pronouns & Family
  "I", "ME", "MY", "MINE", "YOU", "YOUR", "YOURS", "HE", "HIM", "HIS", "SHE", "HER", "HERS",
  "WE", "US", "OUR", "THEY", "THEM", "THEIR", "IT", "ITS",
  "FAMILY", "FRIEND", "MOTHER", "FATHER", "BROTHER", "SISTER", "SON", "DAUGHTER", "BABY", "CAREGIVER",
  
  // Common Verbs
  "GO", "GOING", "GONE", "COME", "COMING", "EAT", "EATING", "DRINK", "DRINKING", "SEE", "LOOK",
  "FEEL", "FEELING", "KNOW", "THINK", "LIKE", "LOVE", "CAN", "COULD", "WILL", "WOULD", "MAY",
  "GIVE", "TAKE", "MAKE", "DO", "DOING", "WORK", "WORKING", "STOP", "START", "CALL", "TALK", "SPEAK",
  
  // Time & Status
  "TODAY", "TOMORROW", "YESTERDAY", "NOW", "LATER", "AGAIN", "TIME", "DAY", "WEEK", "MONTH", "YEAR",
  "YES", "NO", "OK", "OKAY", "FINE", "READY", "DONE", "FINISHED", "MORE", "LESS", "ALL", "SOME",
  
  // Common Nouns
  "HOME", "HOUSE", "ROOM", "BED", "CHAIR", "TABLE", "PHONE", "MONEY", "CAR", "BUS", "TEA", "COFFEE",
  "MILK", "BREAD", "RICE", "FRUIT", "CLOTHES", "DOOR", "WINDOW", "NAME", "PLACE", "THING"
];

// General expanded vocabulary list (cleaned of all double commas or invalid elements)
const GENERAL_WORDS: string[] = [
  "ABLE", "ABOUT", "ABOVE", "ACCEPT", "ACCIDENT", "ACROSS", "ACT", "ACTION", "ACTIVE", "ACTOR",
  "ADD", "ADDRESS", "ADVICE", "AFRAID", "AFTER", "AFTERNOON", "AFTERWARDS", "AGAINST", "AGE", "AGO",
  "AGREE", "AIR", "AIRPORT", "ALIVE", "ALL", "ALLOW", "ALMOST", "ALONE", "ALONG", "ALREADY",
  "ALSO", "ALWAYS", "AMAZING", "ANGER", "ANGRY", "ANIMAL", "ANOTHER", "ANSWER", "ANY", "ANYBODY",
  "ANYMORE", "ANYONE", "ANYTHING", "ANYWHERE", "APARTMENT", "APPEAR", "APPLE", "APPOINTMENT", "AREA",
  "ARM", "ARMY", "AROUND", "ARRIVE", "ART", "ARTICLE", "ARTIST", "ASK", "ASLEEP", "ASSIST",
  "ASSISTANCE", "ATTACK", "ATTENTION", "AUNT", "AUTHOR", "AUTUMN", "AVAILABLE", "AVOID", "AWAKE",
  "AWAY", "AWFUL", "BABY", "BACK", "BAD", "BAG", "BAKE", "BALANCE", "BALL", "BANANA",
  "BAND", "BANK", "BAR", "BATH", "BATHROOM", "BATTERY", "BEACH", "BEAUTIFUL", "BECAUSE", "BECOME",
  "BEDROOM", "BEEF", "BEFORE", "BEGIN", "BEHIND", "BELIEVE", "BELL", "BELOW", "BEND", "BEST",
  "BETTER", "BETWEEN", "BICYCLE", "BIG", "BIKE", "BILL", "BIRD", "BIRTHDAY", "BIT", "BITE",
  "BLACK", "BLANKET", "BLEED", "BLESS", "BLIND", "BLOOD", "BLUE", "BOARD", "BOAT", "BODY",
  "BONE", "BOOK", "BORDER", "BORN", "BORROW", "BOTH", "BOTTLE", "BOTTOM", "BOX", "BOY",
  "BRAIN", "BRAKE", "BRAVE", "BREAD", "BREAK", "BREAKFAST", "BREATH", "BREATHE", "BRIDGE", "BRIGHT",
  "BRING", "BROKEN", "BROWN", "BRUSH", "BUILD", "BUILDING", "BURN", "BUS", "BUSINESS", "BUSY",
  "BUT", "BUTTER", "BUY", "BYE", "CABIN", "CAKE", "CALENDAR", "CALL", "CALM", "CAMERA",
  "CAMP", "CAN", "CANCER", "CANDLE", "CANDY", "CAP", "CAR", "CARD", "CARE", "CAREFUL",
  "CARROT", "CARRY", "CASE", "CASH", "CAT", "CATCH", "CAUSE", "CELL", "CENTER", "CHAIR",
  "CHANCE", "CHANGE", "CHARGE", "CHEAP", "CHECK", "CHEESE", "CHEST", "CHICKEN", "CHILD", "CHILDREN",
  "CHOICE", "CHOOSE", "CHURCH", "CIRCLE", "CITY", "CLASS", "CLEAN", "CLEAR", "CLIMB", "CLINIC",
  "CLOCK", "CLOSE", "CLOSED", "CLOTHES", "CLOTHING", "CLOUD", "CLUB", "COAT", "COFFEE", "COLD",
  "COLLEGE", "COLOR", "COMB", "COME", "COMFORTABLE", "COMMON", "COMPANY", "COMPLAIN", "COMPLETE", "COMPUTER",
  "CONDITION", "CONFUSED", "CONTACT", "CONTINUE", "COOK", "COOL", "COPY", "CORNER", "CORRECT", "COST",
  "COTTON", "COUGH", "COUNT", "COUNTRY", "COUNTY", "COUPLE", "COURSE", "COUSIN", "COVER", "COW",
  "CRASH", "CRAZY", "CREAM", "CREATE", "CRIME", "CROSS", "CROWD", "CRY", "CUP", "CURE",
  "CUT", "CUTE", "DAD", "DAILY", "DANCE", "DANGER", "DANGEROUS", "DARK", "DATE", "DAUGHTER",
  "DAY", "DEAD", "DEAF", "DEAL", "DEAR", "DEATH", "DECIDE", "DEEP", "DEFEND", "DEGREE",
  "DELAY", "DENTIST", "DEPARTMENT", "DEPEND", "DESK", "DESTROY", "DETAIL", "DIABETES", "DIAPER", "DIARY",
  "DICTIONARY", "DIE", "DIFFERENT", "DIFFICULT", "DINNER", "DIRECTION", "DIRTY", "DISAGREE", "DISAPPEAR", "DISCOVER",
  "DISEASE", "DISH", "DISLIKE", "DISTANCE", "DISTURB", "DOCTOR", "DOG", "DOLL", "DOLLAR", "DOOR",
  "DOUBLE", "DOUBT", "DOWN", "DOZEN", "DRAW", "DREAM", "DRESS", "DRINK", "DRIVE", "DRIVER",
  "DROP", "DRUG", "DRY", "DUCK", "DURING", "DUST", "DUTY", "EACH", "EAR", "EARLY",
  "EARN", "EARTH", "EASY", "EAT", "ECONOMY", "EDGE", "EDUCATION", "EFFECT", "EGG", "EIGHT",
  "EITHER", "ELBOW", "ELDERLY", "ELECTION", "ELECTRIC", "ELEVATOR", "ELSE", "EMERGENCY", "EMOTION", "EMPTY",
  "END", "ENEMY", "ENERGY", "ENGINE", "ENJOY", "ENOUGH", "ENTER", "ENTIRE", "ENTRANCE", "ENTRY",
  "EQUAL", "EQUIPMENT", "ERROR", "ESCAPE", "ESPECIALLY", "EVENING", "EVENT", "EVER", "EVERY", "EVERYBODY",
  "EVERYONE", "EVERYTHING", "EVERYWHERE", "EXACT", "EXAM", "EXAMINE", "EXAMPLE", "EXCELLENT", "EXCEPT", "EXCUSE",
  "EXERCISE", "EXIST", "EXIT", "EXPECT", "EXPENSIVE", "EXPERIENCE", "EXPLAIN", "EYE", "FACE", "FACT",
  "FACTORY", "FAIL", "FAINT", "FAIR", "FALL", "FALSE", "FAMILY", "FAMOUS", "FAN", "FAR",
  "FARM", "FAST", "FAT", "FATHER", "FAULT", "FAVOR", "FAVORITE", "FEAR", "FEE", "FEED",
  "FEEL", "FEELING", "FEET", "FEMALE", "FEVER", "FEW", "FIELD", "FIGHT", "FILE", "FILL",
  "FILM", "FINAL", "FINALLY", "FIND", "FINE", "FINGER", "FINISH", "FIRE", "FIRST", "FISH",
  "FIT", "FIVE", "FIX", "FLAG", "FLAT", "FLIGHT", "FLOOR", "FLOWER", "FLU", "FLY",
  "FOG", "FOLD", "FOLLOW", "FOOD", "FOOT", "FOOTBALL", "FOR", "FORCE", "FOREIGN", "FOREST",
  "FORGET", "FORGIVE", "FORK", "FORM", "FORWARD", "FOUR", "FREE", "FREEZE", "FRESH", "FRIDGE",
  "FRIEND", "FRIENDLY", "FROM", "FRONT", "FRUIT", "FULL", "FUN", "FUNNY", "FURNITURE", "FUTURE",
  "GAME", "GARAGE", "GARDEN", "GAS", "GATE", "GATHER", "GENERAL", "GET", "GIFT", "GIRL",
  "GIVE", "GLAD", "GLASS", "GLASSES", "GLOVE", "GO", "GOAL", "GOD", "GOLD", "GOOD",
  "GOODBYE", "GOVERNMENT", "GRADE", "GRANDFATHER", "GRANDMOTHER", "GRASS", "GREAT", "GREEN", "GROUND", "GROUP",
  "GROW", "GUARD", "GUESS", "GUEST", "GUIDE", "GUN", "GUY", "HABIT", "HAIR", "HALF",
  "HALL", "HAND", "HANDLE", "HANG", "HAPPEN", "HAPPY", "HARD", "HARDLY", "HAT", "HAVE",
  "HAZARD", "HEAD", "HEADACHE", "HEALTH", "HEALTHY", "HEAR", "HEART", "HEAT", "HEAVY", "HELD",
  "HELLO", "HELMET", "HELP", "HELPFUL", "HER", "HERE", "HERO", "HERSELF", "HEY", "HI",
  "HIDE", "HIGH", "HIGHWAY", "HILL", "HIM", "HIMSELF", "HIRE", "HIS", "HISTORY", "HIT",
  "HOLD", "HOLE", "HOLIDAY", "HOME", "HONEST", "HONEY", "HOPE", "HORSE", "HOSPITAL", "HOT",
  "HOTEL", "HOUR", "HOUSE", "HOW", "HOWEVER", "HUGE", "HUMAN", "HUNGRY", "HURRY", "HURT",
  "HUSBAND", "ICE", "IDEA", "IF", "ILL", "ILLNESS", "IMAGE", "IMAGINE", "IMPORTANT", "IMPROVE",
  "IN", "INCH", "INCLUDE", "INCREASE", "INDIAN", "INFO", "INFORMATION", "INJURY", "INSIDE", "INSTEAD",
  "INSURANCE", "INTEREST", "INTERNET", "INTO", "INTRODUCE", "INVITE", "ISLAND", "ISSUE", "IT", "ITEM",
  "ITS", "ITSELF", "JACKET", "JAIL", "JANUARY", "JOB", "JOIN", "JOKE", "JOURNEY", "JOY",
  "JUDGE", "JUICE", "JULY", "JUMP", "JUNE", "JUST", "KEEP", "KEY", "KICK", "KID",
  "KILL", "KIND", "KING", "KITCHEN", "KNEE", "KNIFE", "KNOCK", "KNOW", "KNOWLEDGE", "LABOR",
  "LADY", "LAKE", "LAMP", "LAND", "LANGUAGE", "LARGE", "LAST", "LATE", "LATER", "LAUGH",
  "LAW", "LAWYER", "LAY", "LAZY", "LEAD", "LEADER", "LEAF", "LEARN", "LEAST", "LEAVE",
  "LEFT", "LEG", "LEMON", "LEND", "LESS", "LESSON", "LET", "LETTER", "LEVEL", "LIBRARY",
  "LIE", "LIFE", "LIFT", "LIGHT", "LIKE", "LIMIT", "LINE", "LION", "LIP", "LIQUID",
  "LIST", "LISTEN", "LITTLE", "LIVE", "LIVER", "LOCAL", "LOCATION", "LOCK", "LONG", "LOOK",
  "LOSE", "LOSS", "LOT", "LOUD", "LOVE", "LOW", "LUNCH", "LUNG", "MACHINE", "MAD",
  "MAGAZINE", "MAIL", "MAIN", "MAKE", "MALE", "MAN", "MANAGE", "MANAGER", "MANY", "MAP",
  "MARCH", "MARK", "MARKET", "MARRY", "MASSAGE", "MATCH", "MATERIAL", "MATTER", "MAY", "MAYBE",
  "MEAL", "MEAN", "MEANING", "MEASURE", "MEAT", "MEDICINE", "MEDIUM", "MEET", "MEETING", "MEMBER",
  "MEMORY", "MENTAL", "MENU", "MESSAGE", "METAL", "METHOD", "MIDDLE", "MIGHT", "MILE", "MILK",
  "MIND", "MINE", "MINUTE", "MIRROR", "MISS", "MISTAKE", "MIX", "MOBILE", "MODEL", "MODERN",
  "MOM", "MOMENT", "MONDAY", "MONEY", "MONKEY", "MONTH", "MOON", "MORE", "MORNING", "MOST",
  "MOTHER", "MOTOR", "MOUNTAIN", "MOUTH", "MOVE", "MOVEMENT", "MOVIE", "MUCH", "MUD", "MUSIC",
  "MUST", "MY", "MYSELF", "NAME", "NARROW", "NATION", "NATIONAL", "NATIVE", "NATURAL", "NATURE",
  "NEAR", "NEARBY", "NEAT", "NECK", "NEED", "NEEDS", "NEEDLE", "NEGATIVE", "NEIGHBOR", "NEITHER",
  "NERVE", "NERVOUS", "NEVER", "NEW", "NEWS", "NEWSPAPER", "NEXT", "NICE", "NIGHT", "NINE",
  "NO", "NOBODY", "NOISE", "NONE", "NOON", "NOR", "NORMAL", "NORTH", "NOSE", "NOT",
  "NOTE", "NOTEBOOK", "NOTHING", "NOTICE", "NOW", "NUMBER", "NURSE", "NUT", "OBEY", "OBJECT",
  "OCEAN", "OCLOCK", "OCTOBER", "OF", "OFF", "OFFER", "OFFICE", "OFFICER", "OFFICIAL", "OFTEN",
  "OIL", "OK", "OKAY", "OLD", "ON", "ONCE", "ONE", "ONION", "ONLY", "OPEN",
  "OPERATION", "OPINION", "OPPORTUNITY", "OPPOSITE", "OR", "ORANGE", "ORDER", "ORDINARY", "ORGAN", "ORIGINAL",
  "OTHER", "OTHERS", "OTHERWISE", "OUR", "OUT", "OUTSIDE", "OVEN", "OVER", "OWN", "PACK",
  "PAGE", "PAIN", "PAINFUL", "PAINT", "PAIR", "PALM", "PAN", "PANTS", "PAPER", "PARENT",
  "PARK", "PARKING", "PART", "PARTICULAR", "PARTY", "PASS", "PASSENGER", "PASSPORT", "PAST", "PATIENT",
  "PAY", "PEACE", "PEN", "PENCIL", "PEOPLE", "PEPPER", "PERFECT", "PERFORM", "PERHAPS", "PERIOD",
  "PERSON", "PERSONAL", "PET", "PHARMACY", "PHONE", "PHOTO", "PHYSICAL", "PHYSICIAN", "PIANO", "PICK",
  "PICTURE", "PIECE", "PIG", "PILL", "PILLOW", "PILOT", "PIN", "PINK", "PIPE", "PITY",
  "PLACE", "PLAN", "PLANE", "PLANT", "PLASTIC", "PLATE", "PLAY", "PLAYER", "PLEASANT", "PLEASE",
  "PLEASED", "PLEASURE", "PLENTY", "POCKET", "POEM", "POINT", "POISON", "POLICE", "POLICY", "POLITE",
  "POLLUTION", "POOL", "POOR", "POPULAR", "POSITION", "POSITIVE", "POSSIBLE", "POST", "POT", "POTATO",
  "POWER", "POWERFUL", "PRACTICE", "PRAY", "PREFER", "PREGNANT", "PREPARE", "PRESCRIPTION", "PRESENT", "PRESIDENT",
  "PRESS", "PRETTY", "PREVENT", "PRICE", "PRIEST", "PRINCE", "PRINCESS", "PRINT", "PRISON", "PRIVATE",
  "PRIZE", "PROBABLY", "PROBLEM", "PROCESS", "PRODUCE", "PRODUCT", "PROFESSOR", "PROGRAM", "PROGRESS", "PROMISE",
  "PROOF", "PROPER", "PROTECT", "PROUD", "PROVIDE", "PUBLIC", "PULL", "PUMP", "PUNISH", "PUPIL",
  "PURE", "PURPLE", "PURPOSE", "PURSE", "PUSH", "PUT", "QUALITY", "QUANTITY", "QUARTER", "QUEEN",
  "QUESTION", "QUICK", "QUIET", "QUITE", "RACE", "RADIO", "RAILWAY", "RAIN", "RAISE", "RAN",
  "RANGE", "RANK", "RAPID", "RARE", "RATE", "RATHER", "RAW", "REACH", "READ", "READY",
  "REAL", "REALLY", "REASON", "RECEIVE", "RECENT", "RECIPE", "RECORD", "RED", "REDUCE", "REFUSE",
  "REGARD", "REGION", "REGISTER", "REGULAR", "RELATION", "RELATIVE", "RELAX", "RELIGION", "REMAIN", "REMEMBER",
  "REMIND", "REMOVE", "RENT", "REPAIR", "REPEAT", "REPLACE", "REPLY", "REPORT", "REQUEST", "REQUIRE",
  "RESEARCH", "REST", "RESTAURANT", "RESULT", "RETURN", "RICE", "RICH", "RIDE", "RIGHT", "RING",
  "RISE", "RIVER", "ROAD", "ROBOT", "ROCK", "ROOF", "ROOM", "ROOT", "ROPE", "ROSE",
  "ROUGH", "ROUND", "ROUTE", "ROW", "RUBBER", "RUDE", "RUG", "RULE", "RUN", "RUSH",
  "SAD", "SAFE", "SAFETY", "SAIL", "SALAD", "SALARY", "SALE", "SALT", "SAME", "SAND",
  "SANDWICH", "SATURDAY", "SAVE", "SAY", "SCALE", "SCARE", "SCARED", "SCENE", "SCHEDULE", "SCHOOL",
  "SCIENCE", "SCIENTIST", "SCISSORS", "SCORE", "SCREEN", "SEA", "SEARCH", "SEASON", "SEAT", "SECOND",
  "SECRET", "SECRETARY", "SECTION", "SECURITY", "SEE", "SEED", "SEEK", "SEEM", "SELECT", "SELF",
  "SELL", "SEND", "SENSE", "SENTENCE", "SEPARATE", "SEPTEMBER", "SERIOUS", "SERVANT", "SERVE", "SERVICE",
  "SET", "SETTLE", "SEVEN", "SEVERAL", "SEVERE", "SEW", "SHADE", "SHADOW", "SHAKE", "SHALL",
  "SHAME", "SHAPE", "SHARE", "SHARP", "SHE", "SHEET", "SHELF", "SHELL", "SHELTER", "SHINE",
  "SHIP", "SHIRT", "SHOCK", "SHOE", "SHOOT", "SHOP", "SHORE", "SHORT", "SHOULD", "SHOULDER",
  "SHOUT", "SHOW", "SHOWER", "SHUT", "SICK", "SIDE", "SIGHT", "SIGN", "SIGNAL", "SIGNIFICANT",
  "SILENCE", "SILENT", "SILK", "SILVER", "SIMILAR", "SIMPLE", "SINCE", "SING", "SINGLE", "SINK",
  "SISTER", "SIT", "SITUATION", "SIX", "SIZE", "SKILL", "SKIN", "SKIRT", "SKY", "SLEEP",
  "SLEEPY", "SLICE", "SLIDE", "SLIGHT", "SLIP", "SLOW", "SMALL", "SMART", "SMELL", "SMILE",
  "SMOKE", "SMOOTH", "SNAKE", "SNOW", "SO", "SOAP", "SOCIAL", "SOCIETY", "SOCK", "SOFT",
  "SOIL", "SOLDIER", "SOLUTION", "SOLVE", "SOME", "SOMEBODY", "SOMEONE", "SOMETHING", "SOMETIMES", "SOMEWHERE",
  "SON", "SONG", "SOON", "SORRY", "SORT", "SOUL", "SOUND", "SOUP", "SOUTH", "SPACE",
  "SPEAK", "SPEAKER", "SPECIAL", "SPEECH", "SPEED", "SPELL", "SPEND", "SPILL", "SPIRIT", "SPOON",
  "SPORT", "SPOT", "SPREAD", "SPRING", "SQUARE", "STAFF", "STAGE", "STAIR", "STAMP", "STAND",
  "STAR", "START", "STATE", "STATEMENT", "STATION", "STAY", "STEAL", "STEAM", "STEEL", "STEP",
  "STICK", "STILL", "STOMACH", "STONE", "STOP", "STORE", "STORM", "STORY", "STRAIGHT", "STRANGE",
  "STRANGER", "STRAW", "STREAM", "STREET", "STRENGTH", "STRESS", "STRETCH", "STRICT", "STRIKE", "STRING",
  "STRONG", "STUDENT", "STUDY", "STUFF", "STUPID", "SUBJECT", "SUBWAY", "SUCCEED", "SUCCESS", "SUCH",
  "SUDDEN", "SUFFER", "SUGAR", "SUGGEST", "SUIT", "SUMMER", "SUN", "SUNDAY", "SUPER", "SUPPER",
  "SUPPLY", "SUPPORT", "SUPPOSE", "SURE", "SURFACE", "SURGEON", "SURGERY", "SURPRISE", "SWEET", "SWIM",
  "SWING", "SWITCH", "SYMPTOM", "SYSTEM", "TABLE", "TABLET", "TAIL", "TAKE", "TALK", "TALL",
  "TANK", "TAP", "TAPE", "TARGET", "TASK", "TASTE", "TAX", "TAXI", "TEA", "TEACH",
  "TEACHER", "TEAM", "TEAR", "TEETH", "TELEPHONE", "TELEVISION", "TELL", "TEMPERATURE", "TEMPLE", "TEN",
  "TENNIS", "TENT", "TERM", "TERRIBLE", "TEST", "TEXT", "THAN", "THANK", "THANKS", "THAT",
  "THE", "THEATER", "THEIR", "THEM", "THEMSELVES", "THEN", "THERE", "THEREFORE", "THESE", "THEY",
  "THICK", "THIEF", "THIN", "THING", "THINK", "THIRD", "THIRSTY", "THIS", "THOSE", "THOUGH",
  "THOUGHT", "THOUSAND", "THREAD", "THREE", "THROAT", "THROUGH", "THROW", "THUMB", "THURSDAY", "TICKET",
  "TIE", "TIGHT", "TIL", "TILL", "TIME", "TINY", "TIP", "TIRED", "TITLE", "TO",
  "TOAST", "TODAY", "TOE", "TOGETHER", "TOILET", "TOMATO", "TOMORROW", "TONGUE", "TONIGHT", "TOO",
  "TOOL", "TOOTH", "TOP", "TOTAL", "TOUCH", "TOUGH", "TOUR", "TOWARD", "TOWARDS", "TOWEL",
  "TOWER", "TOWN", "TOY", "TRACK", "TRADE", "TRAFFIC", "TRAIN", "TRAINER", "TRAINING", "TRANSLATE",
  "TRANSPORT", "TRASH", "TRAVEL", "TREAT", "TREATMENT", "TREE", "TRICK", "TRIP", "TROUBLE", "TRUCK",
  "TRUE", "TRUTH", "TRY", "TUBE", "TUESDAY", "TURN", "TV", "TWELVE", "TWENTY", "TWICE",
  "TWO", "TYPE", "UGLY", "UMBRELLA", "UNCLE", "UNDER", "UNDERSTAND", "UNDERWEAR", "UNIT", "UNITED",
  "UNIVERSE", "UNIVERSITY", "UNLESS", "UNTIL", "UP", "UPON", "UPPER", "UPSET", "STAIRS", "URGENT",
  "US", "USE", "USED", "USEFUL", "USER", "USUAL", "USUALLY", "VACATION", "VALLEY", "VALUE",
  "VARIETY", "VARIOUS", "VEGETABLE", "VEHICLE", "VERY", "VICTIM", "VICTORY", "VIDEO", "VIEW", "VILLAGE",
  "VISIT", "VISITOR", "VOICE", "VOLUME", "VOTE", "WAIT", "WAITER", "WAKE", "WALK", "WALL",
  "WANT", "WAR", "WARM", "WARNING", "WASH", "WASHROOM", "WASTE", "WATCH", "WATER", "WAVE",
  "WAY", "WE", "WEAK", "WEAR", "WEATHER", "WEB", "WEBSITE", "WEDNESDAY", "WEEK", "WEEKEND",
  "WEIGH", "WEIGHT", "WELCOME", "WELL", "WEST", "WET", "WHAT", "WHEAT", "WHEEL", "WHEELCHAIR",
  "WHEN", "WHERE", "WHETHER", "WHICH", "WHILE", "WHITE", "WHO", "WHOLE", "WHOM", "WHOSE",
  "WHY", "WIDE", "WIFE", "WILD", "WILL", "WIN", "WIND", "WINDOW", "WINE", "WING",
  "WINNER", "WINTER", "WIPE", "WIRE", "WISE", "WISH", "WITH", "WITHIN", "WITHOUT", "WOMAN",
  "WONDER", "WONDERFUL", "WOOD", "WORD", "WORK", "WORKER", "WORLD", "WORRY", "WORSE", "WORST",
  "WORTH", "WOULD", "WOUND", "WRITE", "WRITER", "WRITING", "WRONG", "YARD", "YEAR", "YELLOW",
  "YES", "YESTERDAY", "YET", "YOU", "YOUNG", "YOUR", "YOURS", "YOURSELF", "YOUTH", "ZERO", "ZIPPER", "ZONE"
];

// Pre-filtered clean dictionaries to guarantee no undefined or empty entries
const SAFE_HIGH_PRIORITY = HIGH_PRIORITY_WORDS.filter((w) => typeof w === "string" && w.trim().length > 0);
const SAFE_GENERAL = GENERAL_WORDS.filter((w) => typeof w === "string" && w.trim().length > 0);

/**
 * Given a prefix (e.g. "HEL", "WA", "NEE"), returns 3-5 ranked English word suggestions.
 * Completely defensive: never throws, validates input, ignores invalid entries.
 * Always includes the exact prefix string as Option #1 so currentBuffer can be directly selected.
 */
export function getWordSuggestions(prefix?: string | null, maxSuggestions: number = 5): string[] {
  try {
    if (!prefix || typeof prefix !== "string") {
      return [];
    }

    const cleanPrefix = prefix.trim().toUpperCase();
    if (!cleanPrefix) {
      return [];
    }

    const matched = new Set<string>();

    // 1. ALWAYS add the exact prefix string itself first so the spelled word is directly clickable
    matched.add(cleanPrefix);

    // 2. Check high-priority assistive words starting with cleanPrefix
    for (let i = 0; i < SAFE_HIGH_PRIORITY.length; i++) {
      const word = SAFE_HIGH_PRIORITY[i];
      if (typeof word === "string" && word.startsWith(cleanPrefix)) {
        matched.add(word);
        if (matched.size >= maxSuggestions) break;
      }
    }

    // 3. If we need more suggestions, check general words
    if (matched.size < maxSuggestions) {
      for (let i = 0; i < SAFE_GENERAL.length; i++) {
        const word = SAFE_GENERAL[i];
        if (typeof word === "string" && word.startsWith(cleanPrefix)) {
          matched.add(word);
          if (matched.size >= maxSuggestions) break;
        }
      }
    }

    return Array.from(matched).slice(0, maxSuggestions);
  } catch (err) {
    console.error("[word-dictionary] Safe lookup error caught:", err);
    return [];
  }
}
