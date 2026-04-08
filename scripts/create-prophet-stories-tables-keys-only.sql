-- ========================================
-- 📚 CRÉATION DES TABLES HISTOIRES DU PROPHÈTE (PBUH)
-- ========================================
-- Structure optimisée pour système JSON :
-- - BDD = Métadonnées uniquement (clés, category, is_premium, etc.)
-- - JSON = TOUT le contenu (FR, EN, AR)
-- ========================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- ========================================
-- 📖 TABLE PRINCIPALE : prophet_stories
-- ========================================
CREATE TABLE `prophet_stories` (
  `id` varchar(50) NOT NULL COMMENT 'Clé unique de l\'histoire (ex: birth_of_prophet)',
  `prophet_name` varchar(50) DEFAULT 'muhammad' COMMENT 'Nom du prophète (muhammad, adam, ibrahim, musa, etc.)',
  
  -- 🏷️ Métadonnées uniquement
  `category` enum('childhood','revelation','meccan_period','hijra','medinian_period','battles','companions','family_life','final_years','character_traits','miracles','daily_life','creation','paradise','earth_life','prophets_lineage','prophethood') NOT NULL,
  `difficulty` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
  `age_recommendation` int(11) DEFAULT 12 COMMENT 'Âge recommandé',
  `reading_time` int(11) NOT NULL COMMENT 'Temps de lecture en minutes',
  `word_count` int(11) DEFAULT 0 COMMENT 'Nombre de mots',
  
  -- 📅 Chronologie
  `chronological_order` int(11) DEFAULT 0 COMMENT 'Ordre chronologique',
  `historical_period_start` int(11) DEFAULT NULL COMMENT 'Année hijrienne de début',
  `historical_period_end` int(11) DEFAULT NULL COMMENT 'Année hijrienne de fin',
  
  -- 💎 Premium
  `is_premium` tinyint(1) DEFAULT 0 COMMENT '0=gratuit, 1=premium',
  `has_interactive_elements` tinyint(1) DEFAULT 0,
  
  -- 📊 Statistiques
  `view_count` int(11) DEFAULT 0,
  `rating` decimal(3,2) DEFAULT 0.00,
  `rating_count` int(11) DEFAULT 0,
  
  -- ⏰ Timestamps
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_prophet_name` (`prophet_name`),
  KEY `idx_category` (`category`),
  KEY `idx_difficulty` (`difficulty`),
  KEY `idx_premium` (`is_premium`),
  KEY `idx_chronological` (`chronological_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Histoires des Prophètes (AS) - Métadonnées uniquement (29 histoires: 19 Muhammad + 10 Adam)';

-- ========================================
-- 📑 TABLE : prophet_story_chapters
-- ========================================
CREATE TABLE `prophet_story_chapters` (
  `id` varchar(50) NOT NULL COMMENT 'Clé unique du chapitre (ex: birth_chapter_1)',
  `story_id` varchar(50) NOT NULL COMMENT 'ID de l\'histoire parente',
  
  -- 🔢 Métadonnées uniquement
  `chapter_order` int(11) NOT NULL COMMENT 'Ordre du chapitre dans l\'histoire',
  `reading_time` int(11) DEFAULT 5 COMMENT 'Temps de lecture en minutes',
  
  -- ⏰ Timestamps
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id`),
  KEY `idx_story_order` (`story_id`,`chapter_order`),
  CONSTRAINT `fk_chapter_story` FOREIGN KEY (`story_id`) 
    REFERENCES `prophet_stories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Chapitres - Métadonnées uniquement (contenu dans JSON)';

-- ========================================
-- 📚 TABLE : prophet_story_references
-- ========================================
CREATE TABLE `prophet_story_references` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `story_id` varchar(50) NOT NULL COMMENT 'ID de l\'histoire',
  
  -- 📖 Métadonnées de la référence
  `type` enum('quran','hadith','sira','historical') NOT NULL COMMENT 'Type de référence',
  `source` varchar(255) NOT NULL COMMENT 'Nom de la source (ex: Sahih Bukhari)',
  `reference_text` varchar(500) NOT NULL COMMENT 'Référence exacte (ex: Hadith 123)',
  `authenticity` enum('sahih','hasan','daif') DEFAULT 'sahih' COMMENT 'Authenticité',
  `content` text DEFAULT NULL COMMENT 'Texte original en arabe (source)',
  
  -- 🔢 Ordre
  `reference_order` int(11) DEFAULT 0,
  
  PRIMARY KEY (`id`),
  KEY `idx_story_type` (`story_id`,`type`),
  CONSTRAINT `fk_reference_story` FOREIGN KEY (`story_id`) 
    REFERENCES `prophet_stories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Références islamiques - Texte arabe source seulement';

-- ========================================
-- 📖 TABLE : prophet_story_glossary
-- ========================================
CREATE TABLE `prophet_story_glossary` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `story_id` varchar(50) NOT NULL COMMENT 'ID de l\'histoire',
  
  -- 📝 Métadonnées du terme
  `term_key` varchar(100) NOT NULL COMMENT 'Clé unique du terme (ex: halimah_saddiyah)',
  `arabic_term` varchar(100) DEFAULT NULL COMMENT 'Terme en arabe',
  `pronunciation` varchar(200) DEFAULT NULL COMMENT 'Prononciation phonétique',
  `category` varchar(50) DEFAULT NULL COMMENT 'Catégorie (lieux, personnages, concepts, etc.)',
  
  PRIMARY KEY (`id`),
  KEY `idx_story` (`story_id`),
  KEY `idx_term_key` (`term_key`),
  CONSTRAINT `fk_glossary_story` FOREIGN KEY (`story_id`) 
    REFERENCES `prophet_stories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Glossaire - Métadonnées + terme arabe seulement';

COMMIT;

-- ========================================
-- 📊 DONNÉES À IMPORTER (MÉTADONNÉES SEULEMENT)
-- ========================================

-- 1. Prophet Stories (29 histoires: 19 Muhammad + 10 Adam - métadonnées)
INSERT INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
-- 🕌 Histoires de Muhammad (ﷺ) - 19 histoires
('birth_of_prophet', 'muhammad', 'childhood', 'beginner', 8, 7, 815, 1, -53, NULL, 0, 0),
('childhood_mecca', 'muhammad', 'childhood', 'beginner', 8, 8, 950, 2, -50, -40, 0, 1),
('marriage_khadijah', 'muhammad', 'family_life', 'beginner', 10, 6, 750, 3, -15, -10, 0, 1),
('kaaba_reconstruction', 'muhammad', 'meccan_period', 'intermediate', 12, 7, 900, 4, -5, -5, 0, 1),
('first_revelation', 'muhammad', 'revelation', 'intermediate', 10, 9, 1150, 5, 1, NULL, 0, 1),
('revelation_details', 'muhammad', 'revelation', 'intermediate', 12, 10, 1200, 6, 1, 1, 0, 1),
('early_islam', 'muhammad', 'meccan_period', 'intermediate', 10, 8, 950, 7, 1, 3, 0, 1),
('persecution_muslims', 'muhammad', 'meccan_period', 'intermediate', 12, 10, 1200, 8, 3, 9, 0, 1),
('boycott_banu_hashim', 'muhammad', 'meccan_period', 'advanced', 12, 12, 1400, 9, 6, 9, 0, 1),
('year_of_sadness', 'muhammad', 'meccan_period', 'intermediate', 10, 10, 1150, 10, 9, 9, 0, 1),
('isra_miraj', 'muhammad', 'miracles', 'intermediate', 10, 12, 1350, 11, 10, NULL, 0, 1),
('hijra', 'muhammad', 'hijra', 'intermediate', 10, 11, 1250, 12, 11, NULL, 0, 1),
('battle_badr', 'muhammad', 'battles', 'advanced', 14, 13, 1450, 13, 13, NULL, 0, 1),
('battle_uhud', 'muhammad', 'battles', 'advanced', 14, 14, 1500, 14, 14, NULL, 0, 1),
('battle_khandaq', 'muhammad', 'battles', 'advanced', 14, 16, 1650, 15, 16, NULL, 0, 1),
('treaty_hudaybiyyah', 'muhammad', 'medinian_period', 'intermediate', 12, 12, 1350, 16, 17, NULL, 0, 1),
('conquest_mecca', 'muhammad', 'medinian_period', 'intermediate', 10, 13, 1400, 17, 19, NULL, 0, 1),
('farewell_pilgrimage', 'muhammad', 'medinian_period', 'intermediate', 10, 14, 1450, 18, 21, NULL, 0, 1),
('final_days', 'muhammad', 'medinian_period', 'intermediate', 12, 13, 1400, 19, 22, NULL, 0, 1),
-- 🕌 Histoires d'Adam (عليه السلام) - 10 histoires
('creation_of_adam', 'adam', 'creation', 'beginner', 8, 10, 1200, 1, NULL, NULL, 0, 1),
('adam_in_paradise', 'adam', 'paradise', 'beginner', 8, 8, 950, 2, NULL, NULL, 0, 1),
('prohibition_and_iblis', 'adam', 'paradise', 'intermediate', 10, 10, 1150, 3, NULL, NULL, 0, 1),
('temptation_and_disobedience', 'adam', 'paradise', 'intermediate', 10, 8, 950, 4, NULL, NULL, 0, 1),
('repentance', 'adam', 'paradise', 'beginner', 8, 7, 850, 5, NULL, NULL, 0, 1),
('descent_to_earth', 'adam', 'earth_life', 'intermediate', 10, 8, 950, 6, NULL, NULL, 0, 1),
('adam_hawwa_on_earth', 'adam', 'earth_life', 'intermediate', 10, 9, 1050, 7, NULL, NULL, 0, 1),
('qabil_and_habil', 'adam', 'prophets_lineage', 'intermediate', 12, 9, 1000, 8, NULL, NULL, 0, 1),
('first_murder', 'adam', 'prophets_lineage', 'advanced', 12, 11, 1200, 9, NULL, NULL, 0, 1),
('adam_first_prophet', 'adam', 'prophethood', 'intermediate', 10, 10, 1100, 10, NULL, NULL, 0, 1);

-- 2. Chapitres (93 chapitres - métadonnées: 60 Muhammad + 33 Adam)
INSERT INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
-- Histoires originales
('birth_of_prophet_chapter_1', 'birth_of_prophet', 1, 2),
('birth_of_prophet_chapter_2', 'birth_of_prophet', 2, 2),
('birth_of_prophet_chapter_3', 'birth_of_prophet', 3, 2),
('childhood_chapter_1', 'childhood_mecca', 1, 3),
('childhood_chapter_2', 'childhood_mecca', 2, 3),
('childhood_chapter_3', 'childhood_mecca', 3, 2),
('first_revelation_chapter_1', 'first_revelation', 1, 3),
('first_revelation_chapter_2', 'first_revelation', 2, 4),
('first_revelation_chapter_3', 'first_revelation', 3, 2),
('first_revelation_chapter_4', 'first_revelation', 4, 2),
('kaaba_chapter_1', 'kaaba_reconstruction', 1, 2),
('kaaba_chapter_2', 'kaaba_reconstruction', 2, 2),
('kaaba_chapter_3', 'kaaba_reconstruction', 3, 3),
('marriage_chapter_1', 'marriage_khadijah', 1, 2),
('marriage_chapter_2', 'marriage_khadijah', 2, 2),
('marriage_chapter_3', 'marriage_khadijah', 3, 2),
('revelation_chapter_1', 'revelation_details', 1, 3),
('revelation_chapter_2', 'revelation_details', 2, 3),
('revelation_chapter_3', 'revelation_details', 3, 2),
('revelation_chapter_4', 'revelation_details', 4, 2),
-- Nouvelles histoires
('early_islam_chapter_1', 'early_islam', 1, 3),
('early_islam_chapter_2', 'early_islam', 2, 3),
('early_islam_chapter_3', 'early_islam', 3, 3),
('persecution_chapter_1', 'persecution_muslims', 1, 3),
('persecution_chapter_2', 'persecution_muslims', 2, 4),
('persecution_chapter_3', 'persecution_muslims', 3, 4),
('boycott_chapter_1', 'boycott_banu_hashim', 1, 4),
('boycott_chapter_2', 'boycott_banu_hashim', 2, 4),
('boycott_chapter_3', 'boycott_banu_hashim', 3, 4),
('sadness_chapter_1', 'year_of_sadness', 1, 4),
('sadness_chapter_2', 'year_of_sadness', 2, 3),
('sadness_chapter_3', 'year_of_sadness', 3, 3),
('isra_chapter_1', 'isra_miraj', 1, 4),
('isra_chapter_2', 'isra_miraj', 2, 4),
('isra_chapter_3', 'isra_miraj', 3, 4),
('hijra_chapter_1', 'hijra', 1, 4),
('hijra_chapter_2', 'hijra', 2, 4),
('hijra_chapter_3', 'hijra', 3, 4),
('badr_chapter_1', 'battle_badr', 1, 4),
('badr_chapter_2', 'battle_badr', 2, 5),
('badr_chapter_3', 'battle_badr', 3, 5),
('uhud_chapter_1', 'battle_uhud', 1, 5),
('uhud_chapter_2', 'battle_uhud', 2, 5),
('uhud_chapter_3', 'battle_uhud', 3, 5),
('khandaq_chapter_1', 'battle_khandaq', 1, 4),
('khandaq_chapter_2', 'battle_khandaq', 2, 4),
('khandaq_chapter_3', 'battle_khandaq', 3, 4),
('khandaq_chapter_4', 'battle_khandaq', 4, 5),
('hudaybiyyah_chapter_1', 'treaty_hudaybiyyah', 1, 4),
('hudaybiyyah_chapter_2', 'treaty_hudaybiyyah', 2, 4),
('hudaybiyyah_chapter_3', 'treaty_hudaybiyyah', 3, 4),
('conquest_chapter_1', 'conquest_mecca', 1, 4),
('conquest_chapter_2', 'conquest_mecca', 2, 5),
('conquest_chapter_3', 'conquest_mecca', 3, 5),
('farewell_chapter_1', 'farewell_pilgrimage', 1, 5),
('farewell_chapter_2', 'farewell_pilgrimage', 2, 5),
('farewell_chapter_3', 'farewell_pilgrimage', 3, 4),
('final_chapter_1', 'final_days', 1, 4),
('final_chapter_2', 'final_days', 2, 5),
('final_chapter_3', 'final_days', 3, 5),
-- 🕌 Chapitres d'Adam (عليه السلام) - 33 chapitres
('creation_of_adam_chapter_1', 'creation_of_adam', 1, 3),
('creation_of_adam_chapter_2', 'creation_of_adam', 2, 3),
('creation_of_adam_chapter_3', 'creation_of_adam', 3, 2),
('creation_of_adam_chapter_4', 'creation_of_adam', 4, 2),
('adam_in_paradise_chapter_1', 'adam_in_paradise', 1, 3),
('adam_in_paradise_chapter_2', 'adam_in_paradise', 2, 3),
('adam_in_paradise_chapter_3', 'adam_in_paradise', 3, 2),
('prohibition_and_iblis_chapter_1', 'prohibition_and_iblis', 1, 3),
('prohibition_and_iblis_chapter_2', 'prohibition_and_iblis', 2, 3),
('prohibition_and_iblis_chapter_3', 'prohibition_and_iblis', 3, 2),
('prohibition_and_iblis_chapter_4', 'prohibition_and_iblis', 4, 2),
('temptation_and_disobedience_chapter_1', 'temptation_and_disobedience', 1, 3),
('temptation_and_disobedience_chapter_2', 'temptation_and_disobedience', 2, 3),
('temptation_and_disobedience_chapter_3', 'temptation_and_disobedience', 3, 2),
('repentance_chapter_1', 'repentance', 1, 2),
('repentance_chapter_2', 'repentance', 2, 3),
('repentance_chapter_3', 'repentance', 3, 2),
('descent_to_earth_chapter_1', 'descent_to_earth', 1, 3),
('descent_to_earth_chapter_2', 'descent_to_earth', 2, 3),
('descent_to_earth_chapter_3', 'descent_to_earth', 3, 2),
('adam_hawwa_on_earth_chapter_1', 'adam_hawwa_on_earth', 1, 3),
('adam_hawwa_on_earth_chapter_2', 'adam_hawwa_on_earth', 2, 3),
('adam_hawwa_on_earth_chapter_3', 'adam_hawwa_on_earth', 3, 3),
('qabil_and_habil_chapter_1', 'qabil_and_habil', 1, 3),
('qabil_and_habil_chapter_2', 'qabil_and_habil', 2, 3),
('qabil_and_habil_chapter_3', 'qabil_and_habil', 3, 3),
('first_murder_chapter_1', 'first_murder', 1, 3),
('first_murder_chapter_2', 'first_murder', 2, 3),
('first_murder_chapter_3', 'first_murder', 3, 3),
('first_murder_chapter_4', 'first_murder', 4, 2),
('adam_first_prophet_chapter_1', 'adam_first_prophet', 1, 3),
('adam_first_prophet_chapter_2', 'adam_first_prophet', 2, 4),
('adam_first_prophet_chapter_3', 'adam_first_prophet', 3, 3);

-- 3. Références (10 références - avec texte arabe source)
INSERT INTO `prophet_story_references` (`story_id`, `type`, `source`, `reference_text`, `authenticity`, `content`, `reference_order`) VALUES
('first_revelation', 'quran', 'Sourate Al-Alaq', 'Coran 96:1-5', 'sahih', 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ * خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ * اقْرَأْ وَرَبُّكَ الْأَكْرَمُ * الَّذِي عَلَّمَ بِالْقَلَمِ * عَلَّمَ الْإِنسَانَ مَا لَمْ يَعْلَمْ', 1),
('first_revelation', 'quran', 'Sourate Al-Muddaththir', 'Coran 74:1-3', 'sahih', 'يَا أَيُّهَا الْمُدَّثِّرُ * قُمْ فَأَنذِرْ * وَرَبَّكَ فَكَبِّرْ', 2),
('first_revelation', 'hadith', 'Sahih Bukhari', 'Hadith 3 - Début de la révélation', 'sahih', 'عن عائشة رضي الله عنها قالت: أول ما بدئ به رسول الله صلى الله عليه وسلم من الوحي الرؤيا الصالحة في النوم', 3),
('first_revelation', 'hadith', 'Sahih Bukhari', 'Hadith 3 - Suite de la révélation', 'sahih', 'فجاءه الملك فقال: اقرأ، فقال رسول الله صلى الله عليه وسلم: ما أنا بقارئ', 4),
('first_revelation', 'sira', 'Sirat Ibn Hisham', 'Vol. 1, p. 236-240', 'sahih', 'فرجع بها رسول الله صلى الله عليه وسلم يرجف فؤاده فدخل على خديجة بنت خويلد فقال: زملوني زملوني', 5),
('first_revelation', 'historical', 'Tarikh at-Tabari', 'Vol. 2, Histoire des Prophètes', 'hasan', 'وكان ورقة بن نوفل امرأً تنصر في الجاهلية وكان يكتب الكتاب العبراني', 6),
('childhood_mecca', 'hadith', 'Sahih Muslim', 'Hadith rapporté par Halimah', 'sahih', 'عن حليمة السعدية قالت: أخذته فوضعته في حجري، فما رأيت صبياً قط أنفع منه', 1),
('marriage_khadijah', 'hadith', 'Sahih Bukhari', 'Hadith rapporté par Aisha', 'sahih', 'عن عائشة رضي الله عنها قالت: ما غرت على امرأة ما غرت على خديجة', 1),
('kaaba_reconstruction', 'hadith', 'Sahih Bukhari', 'Hadith sur la reconstruction', 'sahih', 'عن ابن عباس قال: كان النبي صلى الله عليه وسلم يحمل الحجارة مع قريش', 1),
('revelation_details', 'quran', 'Sourate Al-Alaq', 'Coran 96:1-5', 'sahih', 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ. خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ. اقْرَأْ وَرَبُّكَ الْأَكْرَمُ. الَّذِي عَلَّمَ بِالْقَلَمِ. عَلَّمَ الْإِنسَانَ مَا لَمْ يَعْلَمْ', 1);

-- 4. Glossaire (21 termes - métadonnées + arabe)
INSERT INTO `prophet_story_glossary` (`story_id`, `term_key`, `arabic_term`, `pronunciation`, `category`) VALUES
('first_revelation', 'hira', 'حراء', 'hi-ra', 'lieux'),
('first_revelation', 'jibril', 'جبريل', 'ji-bril', 'anges'),
('first_revelation', 'wahy', 'وحي', 'wa-hy', 'concepts'),
('first_revelation', 'iqra', 'اقرأ', 'iq-ra', 'concepts'),
('first_revelation', 'namous', 'الناموس', 'na-mous', 'concepts'),
('first_revelation', 'an_nour', 'النور', 'an-nour', 'lieux'),
('first_revelation', 'hanif', 'حنيف', 'ha-nif', 'concepts'),
('first_revelation', 'alaq', 'علق', 'a-laq', 'concepts'),
('first_revelation', 'zammilouni', 'زملوني', 'zam-mi-lou-ni', 'expressions'),
('first_revelation', 'laylat_al_qadr', 'ليلة القدر', 'lay-lat al-qadr', 'temps'),
('childhood_mecca', 'halimah_saddiyah', 'حليمة السعدية', 'ha-li-ma as-sa-di-yah', 'personnages'),
('childhood_mecca', 'abd_al_muttalib', 'عبد المطلب', 'abd al-mut-ta-lib', 'personnages'),
('childhood_mecca', 'abu_talib', 'أبو طالب', 'a-bou ta-lib', 'personnages'),
('marriage_khadijah', 'khadijah', 'خديجة بنت خويلد', 'kha-di-ja bint khu-way-lid', 'personnages'),
('marriage_khadijah', 'al_amin', 'الأمين', 'al-a-min', 'titles'),
('marriage_khadijah', 'as_sadiq', 'الصادق', 'as-sa-diq', 'titles'),
('kaaba_reconstruction', 'hajar_aswad', 'الحجر الأسود', 'al-ha-jar al-as-wad', 'lieux'),
('kaaba_reconstruction', 'quraychites', 'قريش', 'qu-ray-ch', 'tribus'),
('revelation_details', 'jibril_2', 'جبريل', 'jib-ril', 'angels'),
('revelation_details', 'iqra_2', 'اقرأ', 'iq-ra', 'commands'),
('revelation_details', 'waraqah', 'ورقة بن نوفل', 'wa-ra-qa ibn naw-fal', 'personnages'),

-- ================================================
-- 🕌 HISTOIRES D'ADAM (عليه السلام)
-- ================================================
-- Glossaire pour Adam (AS)
('creation_of_adam', 'khalifa', 'خليفة', 'kha-li-fa', 'concepts'),
('creation_of_adam', 'turab', 'تراب', 'tu-rab', 'concepts'),
('creation_of_adam', 'salsal', 'صلصال', 'sal-sal', 'concepts'),
('creation_of_adam', 'ruh', 'روح', 'ruh', 'concepts'),
('creation_of_adam', 'alhamdulillah', 'الحمد لله', 'al-ham-du-li-llah', 'expressions'),
('adam_in_paradise', 'jannah', 'جنة', 'jan-nah', 'lieux'),
('adam_in_paradise', 'hawwa', 'حواء', 'haw-wa', 'personnages'),
('adam_in_paradise', 'naim', 'نعيم', 'na-im', 'concepts'),
('adam_in_paradise', 'sukun', 'سكن', 'su-kun', 'concepts'),
('prohibition_and_iblis', 'iblis', 'إبليس', 'ib-lis', 'personnages'),
('prohibition_and_iblis', 'shaytan', 'شيطان', 'chay-tan', 'personnages'),
('prohibition_and_iblis', 'sujud', 'سجود', 'su-jud', 'concepts'),
('prohibition_and_iblis', 'kibriya', 'كبرياء', 'kib-ri-ya', 'concepts'),
('prohibition_and_iblis', 'sirat_mustaqim', 'صراط مستقيم', 'si-rat mus-ta-qim', 'concepts'),
('temptation_and_disobedience', 'waswasah', 'وسوسة', 'was-wa-sah', 'concepts'),
('temptation_and_disobedience', 'shajarah', 'شجرة', 'cha-ja-rah', 'concepts'),
('temptation_and_disobedience', 'khulud', 'خلود', 'khu-lud', 'concepts'),
('temptation_and_disobedience', 'maasiyah', 'معصية', 'ma-a-si-yah', 'concepts'),
('temptation_and_disobedience', 'sawat', 'سوءات', 'saw-at', 'concepts'),
('repentance', 'tawbah', 'توبة', 'taw-bah', 'concepts'),
('repentance', 'istighfar', 'استغفار', 'is-tigh-far', 'concepts'),
('repentance', 'nadam', 'ندم', 'na-dam', 'concepts'),
('repentance', 'tawwab', 'تواب', 'taw-wab', 'titles'),
('repentance', 'ghafur', 'غفور', 'gha-fur', 'titles'),
('descent_to_earth', 'hubut', 'هبوط', 'hu-but', 'concepts'),
('descent_to_earth', 'ard', 'أرض', 'ard', 'lieux'),
('descent_to_earth', 'risalah', 'رسالة', 'ri-sa-lah', 'concepts'),
('descent_to_earth', 'huda', 'هدى', 'hu-da', 'concepts'),
('descent_to_earth', 'khilafah', 'خلافة', 'khi-la-fah', 'concepts'),
('adam_hawwa_on_earth', 'taalim', 'تعليم', 'ta-a-lim', 'concepts'),
('adam_hawwa_on_earth', 'arafat', 'عرفات', 'a-ra-fat', 'lieux'),
('adam_hawwa_on_earth', 'dhurriyah', 'ذرية', 'dhur-ri-yah', 'concepts'),
('adam_hawwa_on_earth', 'ibadah', 'عبادة', 'i-ba-dah', 'concepts'),
('qabil_and_habil', 'qabil', 'قابيل', 'qa-bil', 'personnages'),
('qabil_and_habil', 'habil', 'هابيل', 'ha-bil', 'personnages'),
('qabil_and_habil', 'qurban', 'قربان', 'qur-ban', 'concepts'),
('qabil_and_habil', 'taqwa', 'تقوى', 'taq-wa', 'concepts'),
('qabil_and_habil', 'hasad', 'حسد', 'ha-sad', 'concepts'),
('first_murder', 'qatl', 'قتل', 'qatl', 'concepts'),
('first_murder', 'nafs', 'نفس', 'nafs', 'concepts'),
('first_murder', 'ghurab', 'غراب', 'ghu-rab', 'concepts'),
('first_murder', 'nadamah', 'ندامة', 'na-da-mah', 'concepts'),
('first_murder', 'dafn', 'دفن', 'dafn', 'concepts'),
('adam_first_prophet', 'nabi', 'نبي', 'na-bi', 'titles'),
('adam_first_prophet', 'rasul', 'رسول', 'ra-sul', 'titles'),
('adam_first_prophet', 'hikmah', 'حكمة', 'hik-mah', 'concepts'),
('adam_first_prophet', 'mawt', 'موت', 'mawt', 'concepts'),
('adam_first_prophet', 'khalq', 'خلق', 'khalq', 'concepts');

-- ========================================
-- 📚 NOÉ, HUD, SALIH, IBRAHIM, LUT, YUSUF (عليهم السلام)
-- ========================================
-- Contenu fusionné depuis add-nuh, add-hud, add-salih, add-ibrahim, add-lut, add-yusuf
-- Ordre chronologique : Adam → Noé → Hud → Salih → Ibrahim → Lut → Yusuf
-- ========================================

-- Noé (نوح) - 8 histoires
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('nuh_prophecy', 'nuh', 'prophets_lineage', 'beginner', 8, 6, 700, 1, NULL, NULL, 0, 1),
('nuh_call', 'nuh', 'prophets_lineage', 'beginner', 8, 6, 650, 2, NULL, NULL, 0, 1),
('rejection_and_mockery', 'nuh', 'prophets_lineage', 'intermediate', 10, 7, 800, 3, NULL, NULL, 0, 1),
('nuh_patience', 'nuh', 'prophets_lineage', 'intermediate', 10, 7, 750, 4, NULL, NULL, 0, 1),
('building_the_ark', 'nuh', 'miracles', 'beginner', 8, 7, 750, 5, NULL, NULL, 0, 1),
('the_flood', 'nuh', 'miracles', 'intermediate', 10, 7, 700, 6, NULL, NULL, 0, 1),
('nuh_son_refused', 'nuh', 'prophets_lineage', 'intermediate', 10, 7, 750, 7, NULL, NULL, 0, 1),
('lessons_from_nuh', 'nuh', 'prophets_lineage', 'beginner', 8, 6, 650, 8, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('nuh_prophecy_chapter_1', 'nuh_prophecy', 1, 3),
('nuh_prophecy_chapter_2', 'nuh_prophecy', 2, 3),
('nuh_call_chapter_1', 'nuh_call', 1, 3),
('nuh_call_chapter_2', 'nuh_call', 2, 3),
('rejection_and_mockery_chapter_1', 'rejection_and_mockery', 1, 4),
('rejection_and_mockery_chapter_2', 'rejection_and_mockery', 2, 3),
('nuh_patience_chapter_1', 'nuh_patience', 1, 4),
('nuh_patience_chapter_2', 'nuh_patience', 2, 3),
('building_the_ark_chapter_1', 'building_the_ark', 1, 4),
('building_the_ark_chapter_2', 'building_the_ark', 2, 3),
('the_flood_chapter_1', 'the_flood', 1, 4),
('the_flood_chapter_2', 'the_flood', 2, 3),
('nuh_son_refused_chapter_1', 'nuh_son_refused', 1, 4),
('nuh_son_refused_chapter_2', 'nuh_son_refused', 2, 3),
('lessons_from_nuh_chapter_1', 'lessons_from_nuh', 1, 3),
('lessons_from_nuh_chapter_2', 'lessons_from_nuh', 2, 3);

-- Hud (هود) - 6 histoires
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('hud_prophecy', 'hud', 'prophets_lineage', 'beginner', 8, 5, 550, 1, NULL, NULL, 0, 1),
('hud_call', 'hud', 'prophets_lineage', 'beginner', 8, 5, 500, 2, NULL, NULL, 0, 1),
('rejection_arrogance', 'hud', 'prophets_lineage', 'intermediate', 10, 6, 600, 3, NULL, NULL, 0, 1),
('the_ad_people', 'hud', 'prophets_lineage', 'beginner', 8, 5, 500, 4, NULL, NULL, 0, 1),
('the_destruction', 'hud', 'miracles', 'intermediate', 10, 6, 550, 5, NULL, NULL, 0, 1),
('lessons_from_hud', 'hud', 'prophets_lineage', 'beginner', 8, 5, 500, 6, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('hud_prophecy_chapter_1', 'hud_prophecy', 1, 3),
('hud_prophecy_chapter_2', 'hud_prophecy', 2, 2),
('hud_call_chapter_1', 'hud_call', 1, 3),
('hud_call_chapter_2', 'hud_call', 2, 2),
('rejection_arrogance_chapter_1', 'rejection_arrogance', 1, 3),
('rejection_arrogance_chapter_2', 'rejection_arrogance', 2, 3),
('the_ad_people_chapter_1', 'the_ad_people', 1, 3),
('the_ad_people_chapter_2', 'the_ad_people', 2, 2),
('the_destruction_chapter_1', 'the_destruction', 1, 3),
('the_destruction_chapter_2', 'the_destruction', 2, 3),
('lessons_from_hud_chapter_1', 'lessons_from_hud', 1, 3),
('lessons_from_hud_chapter_2', 'lessons_from_hud', 2, 2);

-- Salih (صالح) - 6 histoires
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('salih_prophecy', 'salih', 'prophets_lineage', 'beginner', 8, 5, 550, 1, NULL, NULL, 0, 1),
('salih_call', 'salih', 'prophets_lineage', 'beginner', 8, 5, 500, 2, NULL, NULL, 0, 1),
('the_thamud_people', 'salih', 'prophets_lineage', 'beginner', 8, 5, 500, 3, NULL, NULL, 0, 1),
('the_she_camel', 'salih', 'miracles', 'beginner', 8, 6, 550, 4, NULL, NULL, 0, 1),
('the_camel_killed', 'salih', 'miracles', 'intermediate', 10, 6, 550, 5, NULL, NULL, 0, 1),
('lessons_from_salih', 'salih', 'prophets_lineage', 'beginner', 8, 5, 500, 6, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('salih_prophecy_chapter_1', 'salih_prophecy', 1, 3),
('salih_prophecy_chapter_2', 'salih_prophecy', 2, 2),
('salih_call_chapter_1', 'salih_call', 1, 3),
('salih_call_chapter_2', 'salih_call', 2, 2),
('the_thamud_people_chapter_1', 'the_thamud_people', 1, 3),
('the_thamud_people_chapter_2', 'the_thamud_people', 2, 2),
('the_she_camel_chapter_1', 'the_she_camel', 1, 3),
('the_she_camel_chapter_2', 'the_she_camel', 2, 3),
('the_camel_killed_chapter_1', 'the_camel_killed', 1, 3),
('the_camel_killed_chapter_2', 'the_camel_killed', 2, 3),
('lessons_from_salih_chapter_1', 'lessons_from_salih', 1, 3),
('lessons_from_salih_chapter_2', 'lessons_from_salih', 2, 2);

-- Ibrahim (إبراهيم) - 6 histoires
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('ibrahim_prophecy', 'ibrahim', 'prophets_lineage', 'beginner', 8, 6, 600, 1, NULL, NULL, 0, 1),
('ibrahim_idols', 'ibrahim', 'prophets_lineage', 'beginner', 8, 6, 550, 2, NULL, NULL, 0, 1),
('ibrahim_fire', 'ibrahim', 'miracles', 'beginner', 8, 5, 450, 3, NULL, NULL, 0, 1),
('ibrahim_kaaba', 'ibrahim', 'prophets_lineage', 'beginner', 8, 6, 550, 4, NULL, NULL, 0, 1),
('ibrahim_sacrifice', 'ibrahim', 'prophets_lineage', 'intermediate', 10, 6, 550, 5, NULL, NULL, 0, 1),
('lessons_from_ibrahim', 'ibrahim', 'prophets_lineage', 'beginner', 8, 5, 500, 6, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('ibrahim_prophecy_chapter_1', 'ibrahim_prophecy', 1, 3),
('ibrahim_prophecy_chapter_2', 'ibrahim_prophecy', 2, 3),
('ibrahim_idols_chapter_1', 'ibrahim_idols', 1, 3),
('ibrahim_idols_chapter_2', 'ibrahim_idols', 2, 3),
('ibrahim_fire_chapter_1', 'ibrahim_fire', 1, 3),
('ibrahim_fire_chapter_2', 'ibrahim_fire', 2, 2),
('ibrahim_kaaba_chapter_1', 'ibrahim_kaaba', 1, 3),
('ibrahim_kaaba_chapter_2', 'ibrahim_kaaba', 2, 3),
('ibrahim_sacrifice_chapter_1', 'ibrahim_sacrifice', 1, 3),
('ibrahim_sacrifice_chapter_2', 'ibrahim_sacrifice', 2, 3),
('lessons_from_ibrahim_chapter_1', 'lessons_from_ibrahim', 1, 3),
('lessons_from_ibrahim_chapter_2', 'lessons_from_ibrahim', 2, 2);

-- Lut (لوط) - 5 histoires
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('lut_prophecy', 'lut', 'prophets_lineage', 'beginner', 10, 5, 450, 1, NULL, NULL, 0, 1),
('lut_call', 'lut', 'prophets_lineage', 'beginner', 10, 5, 450, 2, NULL, NULL, 0, 1),
('lut_guests', 'lut', 'prophets_lineage', 'intermediate', 10, 6, 550, 3, NULL, NULL, 0, 1),
('lut_destruction', 'lut', 'prophets_lineage', 'intermediate', 10, 6, 550, 4, NULL, NULL, 0, 1),
('lessons_from_lut', 'lut', 'prophets_lineage', 'beginner', 10, 5, 500, 5, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('lut_prophecy_chapter_1', 'lut_prophecy', 1, 3),
('lut_prophecy_chapter_2', 'lut_prophecy', 2, 2),
('lut_call_chapter_1', 'lut_call', 1, 3),
('lut_call_chapter_2', 'lut_call', 2, 2),
('lut_guests_chapter_1', 'lut_guests', 1, 3),
('lut_guests_chapter_2', 'lut_guests', 2, 3),
('lut_destruction_chapter_1', 'lut_destruction', 1, 3),
('lut_destruction_chapter_2', 'lut_destruction', 2, 3),
('lessons_from_lut_chapter_1', 'lessons_from_lut', 1, 3),
('lessons_from_lut_chapter_2', 'lessons_from_lut', 2, 2);

-- Yusuf (يوسف) - 6 histoires
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('yusuf_dream', 'yusuf', 'prophets_lineage', 'beginner', 8, 5, 500, 1, NULL, NULL, 0, 1),
('yusuf_pit', 'yusuf', 'prophets_lineage', 'beginner', 8, 6, 550, 2, NULL, NULL, 0, 1),
('yusuf_egypt', 'yusuf', 'prophets_lineage', 'intermediate', 10, 6, 550, 3, NULL, NULL, 0, 1),
('yusuf_prison', 'yusuf', 'miracles', 'beginner', 8, 6, 550, 4, NULL, NULL, 0, 1),
('yusuf_reunion', 'yusuf', 'prophets_lineage', 'beginner', 8, 6, 600, 5, NULL, NULL, 0, 1),
('lessons_from_yusuf', 'yusuf', 'prophets_lineage', 'beginner', 8, 5, 500, 6, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('yusuf_dream_chapter_1', 'yusuf_dream', 1, 3),
('yusuf_dream_chapter_2', 'yusuf_dream', 2, 2),
('yusuf_pit_chapter_1', 'yusuf_pit', 1, 3),
('yusuf_pit_chapter_2', 'yusuf_pit', 2, 3),
('yusuf_egypt_chapter_1', 'yusuf_egypt', 1, 3),
('yusuf_egypt_chapter_2', 'yusuf_egypt', 2, 3),
('yusuf_prison_chapter_1', 'yusuf_prison', 1, 3),
('yusuf_prison_chapter_2', 'yusuf_prison', 2, 3),
('yusuf_reunion_chapter_1', 'yusuf_reunion', 1, 3),
('yusuf_reunion_chapter_2', 'yusuf_reunion', 2, 3),
('lessons_from_yusuf_chapter_1', 'lessons_from_yusuf', 1, 3),
('lessons_from_yusuf_chapter_2', 'lessons_from_yusuf', 2, 2);

-- Musa (موسى) - 13 histoires (histoire complète)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('musa_birth', 'musa', 'prophets_lineage', 'beginner', 8, 6, 550, 1, NULL, NULL, 0, 1),
('musa_flee', 'musa', 'prophets_lineage', 'beginner', 8, 6, 550, 2, NULL, NULL, 0, 1),
('musa_burning_bush', 'musa', 'revelation', 'beginner', 8, 6, 550, 3, NULL, NULL, 0, 1),
('musa_pharaoh', 'musa', 'prophets_lineage', 'intermediate', 10, 6, 550, 4, NULL, NULL, 0, 1),
('musa_plagues', 'musa', 'miracles', 'beginner', 8, 6, 550, 5, NULL, NULL, 0, 1),
('musa_exodus', 'musa', 'miracles', 'beginner', 8, 6, 550, 6, NULL, NULL, 0, 1),
('musa_desert', 'musa', 'miracles', 'beginner', 8, 6, 550, 7, NULL, NULL, 0, 1),
('musa_tablets', 'musa', 'revelation', 'beginner', 8, 7, 600, 8, NULL, NULL, 0, 1),
('musa_samiri', 'musa', 'prophets_lineage', 'intermediate', 10, 6, 550, 9, NULL, NULL, 0, 1),
('musa_qarun', 'musa', 'prophets_lineage', 'intermediate', 10, 6, 550, 10, NULL, NULL, 0, 1),
('musa_cow', 'musa', 'prophets_lineage', 'beginner', 8, 5, 500, 11, NULL, NULL, 0, 1),
('musa_khidr', 'musa', 'prophets_lineage', 'intermediate', 10, 7, 600, 12, NULL, NULL, 0, 1),
('lessons_from_musa', 'musa', 'prophets_lineage', 'beginner', 8, 5, 500, 13, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('musa_birth_chapter_1', 'musa_birth', 1, 3),
('musa_birth_chapter_2', 'musa_birth', 2, 3),
('musa_flee_chapter_1', 'musa_flee', 1, 3),
('musa_flee_chapter_2', 'musa_flee', 2, 3),
('musa_burning_bush_chapter_1', 'musa_burning_bush', 1, 3),
('musa_burning_bush_chapter_2', 'musa_burning_bush', 2, 3),
('musa_pharaoh_chapter_1', 'musa_pharaoh', 1, 3),
('musa_pharaoh_chapter_2', 'musa_pharaoh', 2, 3),
('musa_plagues_chapter_1', 'musa_plagues', 1, 3),
('musa_plagues_chapter_2', 'musa_plagues', 2, 3),
('musa_exodus_chapter_1', 'musa_exodus', 1, 3),
('musa_exodus_chapter_2', 'musa_exodus', 2, 3),
('musa_desert_chapter_1', 'musa_desert', 1, 3),
('musa_desert_chapter_2', 'musa_desert', 2, 3),
('musa_tablets_chapter_1', 'musa_tablets', 1, 3),
('musa_tablets_chapter_2', 'musa_tablets', 2, 3),
('musa_tablets_chapter_3', 'musa_tablets', 3, 3),
('musa_samiri_chapter_1', 'musa_samiri', 1, 3),
('musa_samiri_chapter_2', 'musa_samiri', 2, 3),
('musa_qarun_chapter_1', 'musa_qarun', 1, 3),
('musa_qarun_chapter_2', 'musa_qarun', 2, 3),
('musa_cow_chapter_1', 'musa_cow', 1, 3),
('musa_cow_chapter_2', 'musa_cow', 2, 2),
('musa_khidr_chapter_1', 'musa_khidr', 1, 4),
('musa_khidr_chapter_2', 'musa_khidr', 2, 3),
('lessons_from_musa_chapter_1', 'lessons_from_musa', 1, 3),
('lessons_from_musa_chapter_2', 'lessons_from_musa', 2, 2);

-- Dawud (داوود) - 7 histoires (David, roi et prophète)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('dawud_goliath', 'dawud', 'prophets_lineage', 'beginner', 8, 6, 550, 1, NULL, NULL, 0, 1),
('dawud_kingdom', 'dawud', 'prophets_lineage', 'beginner', 8, 6, 550, 2, NULL, NULL, 0, 1),
('dawud_zabur', 'dawud', 'revelation', 'beginner', 8, 5, 500, 3, NULL, NULL, 0, 1),
('dawud_mountains', 'dawud', 'miracles', 'beginner', 8, 5, 500, 4, NULL, NULL, 0, 1),
('dawud_iron', 'dawud', 'miracles', 'beginner', 8, 5, 500, 5, NULL, NULL, 0, 1),
('dawud_judgment', 'dawud', 'prophets_lineage', 'intermediate', 10, 6, 550, 6, NULL, NULL, 0, 1),
('lessons_from_dawud', 'dawud', 'prophets_lineage', 'beginner', 8, 5, 500, 7, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('dawud_goliath_chapter_1', 'dawud_goliath', 1, 3),
('dawud_goliath_chapter_2', 'dawud_goliath', 2, 3),
('dawud_kingdom_chapter_1', 'dawud_kingdom', 1, 3),
('dawud_kingdom_chapter_2', 'dawud_kingdom', 2, 3),
('dawud_zabur_chapter_1', 'dawud_zabur', 1, 3),
('dawud_zabur_chapter_2', 'dawud_zabur', 2, 2),
('dawud_mountains_chapter_1', 'dawud_mountains', 1, 3),
('dawud_mountains_chapter_2', 'dawud_mountains', 2, 2),
('dawud_iron_chapter_1', 'dawud_iron', 1, 3),
('dawud_iron_chapter_2', 'dawud_iron', 2, 2),
('dawud_judgment_chapter_1', 'dawud_judgment', 1, 3),
('dawud_judgment_chapter_2', 'dawud_judgment', 2, 3),
('lessons_from_dawud_chapter_1', 'lessons_from_dawud', 1, 3),
('lessons_from_dawud_chapter_2', 'lessons_from_dawud', 2, 2);

-- Sulayman (سليمان) - 7 histoires (Salomon, roi et prophète)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('sulayman_kingdom', 'sulayman', 'prophets_lineage', 'beginner', 8, 6, 550, 1, NULL, NULL, 0, 1),
('sulayman_wind', 'sulayman', 'miracles', 'beginner', 8, 6, 550, 2, NULL, NULL, 0, 1),
('sulayman_jinn', 'sulayman', 'miracles', 'beginner', 8, 6, 550, 3, NULL, NULL, 0, 1),
('sulayman_ant', 'sulayman', 'prophets_lineage', 'beginner', 8, 5, 500, 4, NULL, NULL, 0, 1),
('sulayman_hoopoe', 'sulayman', 'prophets_lineage', 'beginner', 8, 6, 550, 5, NULL, NULL, 0, 1),
('sulayman_sheba', 'sulayman', 'prophets_lineage', 'intermediate', 10, 7, 600, 6, NULL, NULL, 0, 1),
('lessons_from_sulayman', 'sulayman', 'prophets_lineage', 'beginner', 8, 5, 500, 7, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('sulayman_kingdom_chapter_1', 'sulayman_kingdom', 1, 3),
('sulayman_kingdom_chapter_2', 'sulayman_kingdom', 2, 3),
('sulayman_wind_chapter_1', 'sulayman_wind', 1, 3),
('sulayman_wind_chapter_2', 'sulayman_wind', 2, 3),
('sulayman_jinn_chapter_1', 'sulayman_jinn', 1, 3),
('sulayman_jinn_chapter_2', 'sulayman_jinn', 2, 3),
('sulayman_ant_chapter_1', 'sulayman_ant', 1, 3),
('sulayman_ant_chapter_2', 'sulayman_ant', 2, 2),
('sulayman_hoopoe_chapter_1', 'sulayman_hoopoe', 1, 3),
('sulayman_hoopoe_chapter_2', 'sulayman_hoopoe', 2, 3),
('sulayman_sheba_chapter_1', 'sulayman_sheba', 1, 4),
('sulayman_sheba_chapter_2', 'sulayman_sheba', 2, 3),
('lessons_from_sulayman_chapter_1', 'lessons_from_sulayman', 1, 3),
('lessons_from_sulayman_chapter_2', 'lessons_from_sulayman', 2, 2);

-- Yunus (يونس) - 6 histoires (Jonas, le prophète et la baleine)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('yunus_call', 'yunus', 'prophets_lineage', 'beginner', 8, 5, 500, 1, NULL, NULL, 0, 1),
('yunus_ship', 'yunus', 'prophets_lineage', 'beginner', 8, 6, 550, 2, NULL, NULL, 0, 1),
('yunus_whale', 'yunus', 'miracles', 'beginner', 8, 6, 550, 3, NULL, NULL, 0, 1),
('yunus_repentance', 'yunus', 'prophets_lineage', 'beginner', 8, 6, 550, 4, NULL, NULL, 0, 1),
('yunus_people', 'yunus', 'prophets_lineage', 'beginner', 8, 5, 500, 5, NULL, NULL, 0, 1),
('lessons_from_yunus', 'yunus', 'prophets_lineage', 'beginner', 8, 5, 500, 6, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('yunus_call_chapter_1', 'yunus_call', 1, 3),
('yunus_call_chapter_2', 'yunus_call', 2, 2),
('yunus_ship_chapter_1', 'yunus_ship', 1, 3),
('yunus_ship_chapter_2', 'yunus_ship', 2, 3),
('yunus_whale_chapter_1', 'yunus_whale', 1, 3),
('yunus_whale_chapter_2', 'yunus_whale', 2, 3),
('yunus_repentance_chapter_1', 'yunus_repentance', 1, 3),
('yunus_repentance_chapter_2', 'yunus_repentance', 2, 3),
('yunus_people_chapter_1', 'yunus_people', 1, 3),
('yunus_people_chapter_2', 'yunus_people', 2, 2),
('lessons_from_yunus_chapter_1', 'lessons_from_yunus', 1, 3),
('lessons_from_yunus_chapter_2', 'lessons_from_yunus', 2, 2);

-- Ayyub (أيوب) - 5 histoires (Job, la patience)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('ayyub_blessings', 'ayyub', 'prophets_lineage', 'beginner', 8, 5, 500, 1, NULL, NULL, 0, 1),
('ayyub_trial', 'ayyub', 'prophets_lineage', 'beginner', 8, 6, 550, 2, NULL, NULL, 0, 1),
('ayyub_patience', 'ayyub', 'prophets_lineage', 'beginner', 8, 6, 550, 3, NULL, NULL, 0, 1),
('ayyub_healing', 'ayyub', 'miracles', 'beginner', 8, 5, 500, 4, NULL, NULL, 0, 1),
('lessons_from_ayyub', 'ayyub', 'prophets_lineage', 'beginner', 8, 5, 500, 5, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('ayyub_blessings_chapter_1', 'ayyub_blessings', 1, 3),
('ayyub_blessings_chapter_2', 'ayyub_blessings', 2, 2),
('ayyub_trial_chapter_1', 'ayyub_trial', 1, 3),
('ayyub_trial_chapter_2', 'ayyub_trial', 2, 3),
('ayyub_patience_chapter_1', 'ayyub_patience', 1, 3),
('ayyub_patience_chapter_2', 'ayyub_patience', 2, 3),
('ayyub_healing_chapter_1', 'ayyub_healing', 1, 3),
('ayyub_healing_chapter_2', 'ayyub_healing', 2, 2),
('lessons_from_ayyub_chapter_1', 'lessons_from_ayyub', 1, 3),
('lessons_from_ayyub_chapter_2', 'lessons_from_ayyub', 2, 2);

-- Zakariya (زكريا) - 4 histoires (Zacharie, père de Yahya)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('zakariya_prayer', 'zakariya', 'prophets_lineage', 'beginner', 8, 5, 500, 1, NULL, NULL, 0, 1),
('zakariya_announcement', 'zakariya', 'miracles', 'beginner', 8, 5, 500, 2, NULL, NULL, 0, 1),
('zakariya_yahya', 'zakariya', 'prophets_lineage', 'beginner', 8, 5, 500, 3, NULL, NULL, 0, 1),
('lessons_from_zakariya', 'zakariya', 'prophets_lineage', 'beginner', 8, 5, 500, 4, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('zakariya_prayer_chapter_1', 'zakariya_prayer', 1, 3),
('zakariya_prayer_chapter_2', 'zakariya_prayer', 2, 2),
('zakariya_announcement_chapter_1', 'zakariya_announcement', 1, 3),
('zakariya_announcement_chapter_2', 'zakariya_announcement', 2, 2),
('zakariya_yahya_chapter_1', 'zakariya_yahya', 1, 3),
('zakariya_yahya_chapter_2', 'zakariya_yahya', 2, 2),
('lessons_from_zakariya_chapter_1', 'lessons_from_zakariya', 1, 3),
('lessons_from_zakariya_chapter_2', 'lessons_from_zakariya', 2, 2);

-- Yahya (يحيى) - 4 histoires (Jean-Baptiste)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('yahya_birth', 'yahya', 'prophets_lineage', 'beginner', 8, 5, 500, 1, NULL, NULL, 0, 1),
('yahya_purity', 'yahya', 'prophets_lineage', 'beginner', 8, 5, 500, 2, NULL, NULL, 0, 1),
('yahya_isa', 'yahya', 'prophets_lineage', 'beginner', 8, 5, 500, 3, NULL, NULL, 0, 1),
('lessons_from_yahya', 'yahya', 'prophets_lineage', 'beginner', 8, 5, 500, 4, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('yahya_birth_chapter_1', 'yahya_birth', 1, 3),
('yahya_birth_chapter_2', 'yahya_birth', 2, 2),
('yahya_purity_chapter_1', 'yahya_purity', 1, 3),
('yahya_purity_chapter_2', 'yahya_purity', 2, 2),
('yahya_isa_chapter_1', 'yahya_isa', 1, 3),
('yahya_isa_chapter_2', 'yahya_isa', 2, 2),
('lessons_from_yahya_chapter_1', 'lessons_from_yahya', 1, 3),
('lessons_from_yahya_chapter_2', 'lessons_from_yahya', 2, 2);

-- Ilyas (إلياس) - 4 histoires (Élie)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('ilyas_call', 'ilyas', 'prophets_lineage', 'beginner', 8, 5, 500, 1, NULL, NULL, 0, 1),
('ilyas_baal', 'ilyas', 'prophets_lineage', 'beginner', 8, 5, 500, 2, NULL, NULL, 0, 1),
('ilyas_miracle', 'ilyas', 'miracles', 'beginner', 8, 5, 500, 3, NULL, NULL, 0, 1),
('lessons_from_ilyas', 'ilyas', 'prophets_lineage', 'beginner', 8, 5, 500, 4, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('ilyas_call_chapter_1', 'ilyas_call', 1, 3),
('ilyas_call_chapter_2', 'ilyas_call', 2, 2),
('ilyas_baal_chapter_1', 'ilyas_baal', 1, 3),
('ilyas_baal_chapter_2', 'ilyas_baal', 2, 2),
('ilyas_miracle_chapter_1', 'ilyas_miracle', 1, 3),
('ilyas_miracle_chapter_2', 'ilyas_miracle', 2, 2),
('lessons_from_ilyas_chapter_1', 'lessons_from_ilyas', 1, 3),
('lessons_from_ilyas_chapter_2', 'lessons_from_ilyas', 2, 2);

-- Al-Yasa (اليسع) - 4 histoires (Élisée)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('alyasa_succession', 'alyasa', 'prophets_lineage', 'beginner', 8, 5, 500, 1, NULL, NULL, 0, 1),
('alyasa_prophecy', 'alyasa', 'prophets_lineage', 'beginner', 8, 5, 500, 2, NULL, NULL, 0, 1),
('alyasa_miracles', 'alyasa', 'miracles', 'beginner', 8, 5, 500, 3, NULL, NULL, 0, 1),
('lessons_from_alyasa', 'alyasa', 'prophets_lineage', 'beginner', 8, 5, 500, 4, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('alyasa_succession_chapter_1', 'alyasa_succession', 1, 3),
('alyasa_succession_chapter_2', 'alyasa_succession', 2, 2),
('alyasa_prophecy_chapter_1', 'alyasa_prophecy', 1, 3),
('alyasa_prophecy_chapter_2', 'alyasa_prophecy', 2, 2),
('alyasa_miracles_chapter_1', 'alyasa_miracles', 1, 3),
('alyasa_miracles_chapter_2', 'alyasa_miracles', 2, 2),
('lessons_from_alyasa_chapter_1', 'lessons_from_alyasa', 1, 3),
('lessons_from_alyasa_chapter_2', 'lessons_from_alyasa', 2, 2);

-- Shu'ayb (شعيب) - 5 histoires (Jethro, peuple de Madyan)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('shuayb_call', 'shuayb', 'prophets_lineage', 'beginner', 8, 5, 500, 1, NULL, NULL, 0, 1),
('shuayb_weights', 'shuayb', 'prophets_lineage', 'beginner', 8, 5, 500, 2, NULL, NULL, 0, 1),
('shuayb_rejection', 'shuayb', 'prophets_lineage', 'beginner', 8, 5, 500, 3, NULL, NULL, 0, 1),
('shuayb_destruction', 'shuayb', 'prophets_lineage', 'intermediate', 10, 5, 500, 4, NULL, NULL, 0, 1),
('lessons_from_shuayb', 'shuayb', 'prophets_lineage', 'beginner', 8, 5, 500, 5, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('shuayb_call_chapter_1', 'shuayb_call', 1, 3),
('shuayb_call_chapter_2', 'shuayb_call', 2, 2),
('shuayb_weights_chapter_1', 'shuayb_weights', 1, 3),
('shuayb_weights_chapter_2', 'shuayb_weights', 2, 2),
('shuayb_rejection_chapter_1', 'shuayb_rejection', 1, 3),
('shuayb_rejection_chapter_2', 'shuayb_rejection', 2, 2),
('shuayb_destruction_chapter_1', 'shuayb_destruction', 1, 3),
('shuayb_destruction_chapter_2', 'shuayb_destruction', 2, 2),
('lessons_from_shuayb_chapter_1', 'lessons_from_shuayb', 1, 3),
('lessons_from_shuayb_chapter_2', 'lessons_from_shuayb', 2, 2);

-- Isa (عيسى) - 9 histoires (Jésus, fils de Marie)
INSERT IGNORE INTO `prophet_stories` (`id`, `prophet_name`, `category`, `difficulty`, `age_recommendation`, `reading_time`, `word_count`, `chronological_order`, `historical_period_start`, `historical_period_end`, `is_premium`, `has_interactive_elements`) VALUES
('isa_birth', 'isa', 'prophets_lineage', 'beginner', 8, 6, 550, 1, NULL, NULL, 0, 1),
('isa_cradle', 'isa', 'miracles', 'beginner', 8, 5, 500, 2, NULL, NULL, 0, 1),
('isa_childhood', 'isa', 'prophets_lineage', 'beginner', 8, 6, 550, 3, NULL, NULL, 0, 1),
('isa_prophecy', 'isa', 'revelation', 'beginner', 8, 6, 550, 4, NULL, NULL, 0, 1),
('isa_miracles', 'isa', 'miracles', 'beginner', 8, 6, 550, 5, NULL, NULL, 0, 1),
('isa_disciples', 'isa', 'prophets_lineage', 'beginner', 8, 6, 550, 6, NULL, NULL, 0, 1),
('isa_table', 'isa', 'miracles', 'beginner', 8, 6, 550, 7, NULL, NULL, 0, 1),
('isa_ascension', 'isa', 'prophets_lineage', 'intermediate', 10, 6, 550, 8, NULL, NULL, 0, 1),
('lessons_from_isa', 'isa', 'prophets_lineage', 'beginner', 8, 5, 500, 9, NULL, NULL, 0, 1);

INSERT IGNORE INTO `prophet_story_chapters` (`id`, `story_id`, `chapter_order`, `reading_time`) VALUES
('isa_birth_chapter_1', 'isa_birth', 1, 3),
('isa_birth_chapter_2', 'isa_birth', 2, 3),
('isa_cradle_chapter_1', 'isa_cradle', 1, 3),
('isa_cradle_chapter_2', 'isa_cradle', 2, 2),
('isa_childhood_chapter_1', 'isa_childhood', 1, 3),
('isa_childhood_chapter_2', 'isa_childhood', 2, 3),
('isa_prophecy_chapter_1', 'isa_prophecy', 1, 3),
('isa_prophecy_chapter_2', 'isa_prophecy', 2, 3),
('isa_miracles_chapter_1', 'isa_miracles', 1, 3),
('isa_miracles_chapter_2', 'isa_miracles', 2, 3),
('isa_disciples_chapter_1', 'isa_disciples', 1, 3),
('isa_disciples_chapter_2', 'isa_disciples', 2, 3),
('isa_table_chapter_1', 'isa_table', 1, 3),
('isa_table_chapter_2', 'isa_table', 2, 3),
('isa_ascension_chapter_1', 'isa_ascension', 1, 3),
('isa_ascension_chapter_2', 'isa_ascension', 2, 3),
('lessons_from_isa_chapter_1', 'lessons_from_isa', 1, 3),
('lessons_from_isa_chapter_2', 'lessons_from_isa', 2, 2);

COMMIT;

-- ========================================
-- ✅ TABLES CRÉÉES ET DONNÉES IMPORTÉES
-- ========================================
-- Structure : BDD = Clés + Métadonnées seulement
-- Contenu : JSON = Tout le texte (FR, EN, AR)
--
-- Prochaine étape :
-- 1. Vérifier que les traductions JSON existent dans private/premium/muhammad/
-- 2. Tester l'API : /api/prophet-stories.php?action=catalog&lang=fr
