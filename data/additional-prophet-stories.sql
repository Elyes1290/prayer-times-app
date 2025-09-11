-- ========================================
-- 📚 HISTOIRES SUPPLÉMENTAIRES DU PROPHÈTE (PBUH)
-- ========================================
-- Histoires additionnelles pour compléter la collection

-- 3. L'ENFANCE À LA MECQUE
INSERT INTO prophet_stories (
    id, title, title_arabic, introduction, conclusion, moral_lesson,
    category, difficulty, age_recommendation, reading_time, word_count,
    chronological_order, historical_period_start, historical_period_end, 
    historical_location, historical_context,
    is_premium, has_interactive_elements, created_at
) VALUES (
    'childhood_mecca',
    'L''Enfance du Prophète à La Mecque',
    'طفولة النبي في مكة',
    'L''enfance du Prophète Mohammad (ﷺ) à La Mecque fut marquée par des événements extraordinaires qui révélaient déjà sa nature exceptionnelle. Élevé par Halimah as-Sa''diyyah dans le désert, puis retourné à La Mecque, le jeune Mohammad grandit sous la protection de son grand-père Abd al-Muttalib, puis de son oncle Abu Talib.',
    'Cette période de l''enfance du Prophète (ﷺ) nous montre comment Allah prépare Ses messagers dès leur plus jeune âge, leur donnant des qualités exceptionnelles et les protégeant des maux de leur époque, tout en les préparant à leur mission future.',
    'L''enfance du Prophète nous enseigne l''importance de l''éducation, de la protection des orphelins, et comment Allah guide ceux qu''Il choisit dès leur plus jeune âge.',
    'childhood',
    'beginner',
    8,
    8,
    950,
    2,
    -50,
    -40,
    'La Mecque',
    'Période de l''enfance du Prophète, élevé par Halimah puis retourné à La Mecque',
    FALSE,
    TRUE,
    NOW()
);

-- Chapitres de l'enfance
INSERT INTO prophet_story_chapters (id, story_id, title, content, chapter_order, reading_time) VALUES
('childhood_chapter_1', 'childhood_mecca', 'Chez Halimah as-Sa''diyyah',
'Le Prophète Mohammad (ﷺ) passa ses premières années dans le désert, élevé par Halimah as-Sa''diyyah de la tribu des Banou Sa''d. Cette période fut marquée par des bénédictions extraordinaires qui touchèrent toute la famille de Halimah.

Dès que Halimah prit l''enfant dans ses bras, les bénédictions commencèrent à se manifester : son âne devint vigoureux et rapide, ses chamelles donnèrent du lait en abondance, et la prospérité s''installa dans leur foyer. Même leur fils, qui était chétif, devint robuste et en bonne santé.

Halimah raconta : "Jamais je n''ai vu un enfant comme celui-ci. Il ne pleurait jamais, ne causait aucun trouble, et dormait paisiblement. Quand il se réveillait, il souriait et regardait autour de lui avec une sagesse qui dépassait son âge."

L''enfant grandit rapidement et fort, contrairement aux autres enfants de son âge. À l''âge de deux ans, il était déjà plus grand et plus fort que les enfants de quatre ans. Halimah et son mari comprirent qu''ils avaient reçu un enfant béni.', 1, 3),

('childhood_chapter_2', 'childhood_mecca', 'L''Incident de l''Ouverture de la Poitrine',
'Quand le Prophète (ﷺ) eut environ quatre ans, un événement extraordinaire se produisit. Alors qu''il jouait avec d''autres enfants, deux hommes vêtus de blanc apparurent soudainement. Ils prirent l''enfant et l''emmenèrent à l''écart.

Halimah, inquiète, courut vers eux et vit une scène qui la terrifia : les deux hommes avaient ouvert la poitrine de l''enfant et semblaient y faire quelque chose. Elle cria et se précipita vers eux, mais ils lui dirent : "Ne crains rien, nous sommes des anges envoyés par Allah."

Ils lavèrent le cœur de l''enfant avec de l''eau pure, puis le remirent en place. L''enfant se releva comme si rien ne s''était passé, mais Halimah comprit qu''il s''était passé quelque chose de très important.

Quand elle raconta cet incident à Aminah, la mère du Prophète, celle-ci lui dit : "J''ai toujours su que mon fils était spécial. Allah l''a choisi pour une grande mission."', 2, 3),

('childhood_chapter_3', 'childhood_mecca', 'Le Retour à La Mecque',
'À l''âge de cinq ans, le Prophète (ﷺ) fut ramené à La Mecque chez sa mère Aminah. Malgré la joie de retrouver son fils, Aminah était inquiète car elle avait perdu son mari Abdallah et vivait dans la pauvreté.

Heureusement, Abd al-Muttalib, le grand-père paternel, prit en charge l''éducation de son petit-fils. Il l''aimait profondément et le traitait avec une affection particulière, pressentant sa grandeur future.

Le jeune Mohammad grandit dans la maison de son grand-père, apprenant les valeurs nobles des Arabes : l''hospitalité, la générosité, la protection des faibles, et l''honneur. Il observait son grand-père gérer les affaires de la tribu et s''occupait des pèlerins qui venaient visiter la Kaaba.

Quand Abd al-Muttalib mourut, l''oncle Abu Talib prit la responsabilité de l''enfant. Abu Talib était pauvre mais noble, et il aimait son neveu comme son propre fils.', 3, 2);

-- 4. LE MARIAGE AVEC KHADIJAH
INSERT INTO prophet_stories (
    id, title, title_arabic, introduction, conclusion, moral_lesson,
    category, difficulty, age_recommendation, reading_time, word_count,
    chronological_order, historical_period_start, historical_period_end,
    historical_location, historical_context,
    is_premium, has_interactive_elements, created_at
) VALUES (
    'marriage_khadijah',
    'Le Mariage avec Khadijah',
    'زواج النبي من خديجة',
    'À l''âge de vingt-cinq ans, Mohammad (ﷺ) était connu à La Mecque pour sa droiture, sa loyauté et sa sagesse. Khadijah bint Khuwaylid, une femme noble et riche, entendit parler de ses qualités exceptionnelles et lui proposa de gérer ses affaires commerciales. Ce partenariat professionnel allait se transformer en union sacrée qui marquerait l''histoire de l''Islam.',
    'Le mariage du Prophète (ﷺ) avec Khadijah (رضي الله عنها) fut une union bénie qui dura vingt-cinq ans. Khadijah fut la première à croire en sa mission prophétique et le soutint dans les moments les plus difficiles. Elle fut la mère de tous les croyants et un exemple de fidélité, de sagesse et de dévotion.',
    'Ce mariage nous enseigne l''importance de choisir un partenaire qui partage nos valeurs, qui nous soutient dans nos épreuves, et qui croit en notre mission. Khadijah fut un modèle de femme musulmane accomplie.',
    'family_life',
    'beginner',
    10,
    6,
    750,
    3,
    -15,
    -10,
    'La Mecque',
    'Période pré-prophétique, Mohammad travaille dans le commerce',
    FALSE,
    TRUE,
    NOW()
);

-- Chapitres du mariage
INSERT INTO prophet_story_chapters (id, story_id, title, content, chapter_order, reading_time) VALUES
('marriage_chapter_1', 'marriage_khadijah', 'Khadijah, la Noble Commerçante',
'Khadijah bint Khuwaylid (رضي الله عنها) était une femme exceptionnelle à La Mecque. Veuve à deux reprises, elle avait hérité d''une fortune considérable et gérait elle-même ses affaires commerciales, chose rare pour une femme de cette époque.

Elle était connue pour sa sagesse, sa générosité et sa droiture. Les gens l''appelaient "At-Tahira" (la Pure) et "Al-Kubra" (la Grande) en raison de sa noblesse de caractère et de sa position sociale élevée.

Khadijah cherchait un homme honnête et digne de confiance pour gérer ses caravanes commerciales. Elle avait entendu parler de Mohammad (ﷺ) et de sa réputation d''"Al-Amin" (le Digne de Confiance) et d''"As-Sadiq" (le Véridique).

Elle envoya une proposition à Mohammad (ﷺ) : "Je t''offre le double de ce que je paie habituellement à mes commerçants si tu acceptes de gérer mes affaires." Mohammad (ﷺ) accepta cette proposition honorable.', 1, 2),

('marriage_chapter_2', 'marriage_khadijah', 'Le Voyage Commercial',
'Mohammad (ﷺ) partit en Syrie avec la caravane de Khadijah, accompagné de Maysarah, l''esclave de Khadijah. Pendant ce voyage, Maysarah observa le comportement exceptionnel de Mohammad (ﷺ) et fut témoin de plusieurs signes de sa grandeur future.

À Bosra, un moine chrétien nommé Bahira vit Mohammad (ﷺ) et reconnut en lui les signes de la prophétie. Il dit à Maysarah : "Cet homme sera un prophète. Prends soin de lui."

Le voyage fut un succès commercial complet. Mohammad (ﷺ) rapporta des profits exceptionnels, bien plus que ce que Khadijah avait espéré. Mais plus important encore, il rapporta une réputation d''honnêteté et de compétence qui impressionna Khadijah.

Quand Maysarah raconta à Khadijah tout ce qu''il avait observé, elle fut profondément touchée par la noblesse de caractère de Mohammad (ﷺ).', 2, 2),

('marriage_chapter_3', 'marriage_khadijah', 'La Demande en Mariage',
'Khadijah (رضي الله عنها) envoya sa confidente Nafisah bint Munyah auprès de Mohammad (ﷺ) pour lui faire part de son désir de mariage. Mohammad (ﷺ) fut surpris par cette proposition, car Khadijah était plus âgée que lui et beaucoup plus riche.

Nafisah lui dit : "Pourquoi ne te maries-tu pas ?" Mohammad (ﷺ) répondit : "Je n''ai pas les moyens de me marier." Nafisah lui dit : "Et si Allah te donnait les moyens, accepterais-tu de te marier avec une femme noble, riche, et de bonne famille ?"

Mohammad (ﷺ) demanda : "Qui est cette femme ?" Nafisah répondit : "Khadijah bint Khuwaylid." Mohammad (ﷺ) accepta avec joie cette proposition bénie.

Le mariage fut célébré en présence des familles. Khadijah avait quarante ans et Mohammad (ﷺ) vingt-cinq ans. Ce fut un mariage d''amour et de respect mutuel qui allait durer vingt-cinq ans.', 3, 2);

-- 5. LA CONSTRUCTION DE LA KAABA
INSERT INTO prophet_stories (
    id, title, title_arabic, introduction, conclusion, moral_lesson,
    category, difficulty, age_recommendation, reading_time, word_count,
    chronological_order, historical_period_start, historical_period_end,
    historical_location, historical_context,
    is_premium, has_interactive_elements, created_at
) VALUES (
    'kaaba_reconstruction',
    'La Reconstruction de la Kaaba',
    'إعادة بناء الكعبة',
    'Quand le Prophète Mohammad (ﷺ) avait trente-cinq ans, les Quraychites décidèrent de reconstruire la Kaaba. Les murs de la sainte maison s''étaient affaiblis à cause des inondations et du temps. Cet événement allait révéler la sagesse et l''intégrité exceptionnelles du futur Prophète.',
    'La reconstruction de la Kaaba fut un événement crucial qui révéla la sagesse et l''intégrité du Prophète Mohammad (ﷺ) aux yeux de tous les Quraychites. Sa solution pacifique du conflit de la Pierre Noire montra qu''il était déjà reconnu comme un arbitre juste et sage, préfigurant sa mission prophétique future.',
    'Cet événement nous enseigne l''importance de la sagesse dans la résolution des conflits, de l''équité dans le partage des responsabilités, et comment Allah prépare Ses messagers en leur donnant des occasions de montrer leur caractère exceptionnel.',
    'meccan_period',
    'intermediate',
    12,
    7,
    900,
    4,
    -5,
    -5,
    'La Mecque',
    'Période pré-prophétique, Mohammad reconnu pour sa sagesse',
    FALSE,
    TRUE,
    NOW()
);

-- Chapitres de la reconstruction
INSERT INTO prophet_story_chapters (id, story_id, title, content, chapter_order, reading_time) VALUES
('kaaba_chapter_1', 'kaaba_reconstruction', 'La Décision de Reconstruction',
'Les murs de la Kaaba s''étaient considérablement affaiblis à cause des inondations successives et de l''usure du temps. Les Quraychites craignaient que la sainte maison ne s''effondre complètement, ce qui aurait été une catastrophe pour leur prestige et leur commerce.

Les chefs des différentes tribus se réunirent pour discuter de la reconstruction. Tous étaient d''accord sur la nécessité de reconstruire, mais personne ne voulait prendre la responsabilité de démolir la sainte maison, de peur de la colère divine.

Finalement, Al-Walid ibn al-Mughira, un des chefs les plus respectés, prit l''initiative. Il dit : "Ô Allah, nous ne voulons que le bien. Si Tu approuves notre action, facilite-la-nous." Puis il commença à démolir un coin de la Kaaba.

Quand rien de mal ne se produisit, les autres Quraychites se joignirent à lui et démolirent complètement l''ancienne structure, ne gardant que les fondations originales posées par le Prophète Ibrahim (عليه السلام).', 1, 2),

('kaaba_chapter_2', 'kaaba_reconstruction', 'Le Partage des Responsabilités',
'Les Quraychites décidèrent de partager la reconstruction entre les différentes tribus. Chaque tribu fut responsable d''un côté de la Kaaba. Les matériaux furent apportés : de la pierre de qualité, du bois, et des métaux précieux.

Mohammad (ﷺ) participa activement à la reconstruction, transportant des pierres avec les autres. Il était connu pour sa force physique et son endurance. Les gens remarquaient sa dévotion et son respect pour la sainte maison.

Chaque tribu travailla sur sa section avec fierté et dévotion. L''atmosphère était empreinte de respect et de crainte révérencielle. Tous voulaient contribuer à la reconstruction de la maison d''Allah.', 2, 2),

('kaaba_chapter_3', 'kaaba_reconstruction', 'Le Conflit de la Pierre Noire',
'Quand vint le moment de remettre la Pierre Noire (Al-Hajar al-Aswad) à sa place, un conflit éclata entre les tribus. Chacune voulait avoir l''honneur de placer la pierre sacrée, considérée comme un don du ciel.

Le conflit menaçait de dégénérer en violence. Les épées furent sorties et la situation devint critique. C''est alors qu''Abu Umayyah ibn al-Mughira proposa une solution : "Que le premier homme qui entrera par cette porte soit notre arbitre."

Le premier à entrer fut Mohammad (ﷺ). En le voyant, tous s''écrièrent : "C''est Al-Amin (le Digne de Confiance) ! Nous acceptons son jugement !"

Mohammad (ﷺ) demanda une grande pièce de tissu, y plaça la Pierre Noire au centre, puis demanda à chaque chef de tribu de tenir un coin du tissu. Ensemble, ils portèrent la pierre à sa place, et Mohammad (ﷺ) la plaça de ses propres mains.

Cette solution sage satisfit tout le monde et évita un conflit sanglant. Tous reconnurent la sagesse exceptionnelle de Mohammad (ﷺ).', 3, 3);

-- 6. LA RÉVÉLATION DE LA GROTTE DE HIRA (détail de l'histoire existante)
INSERT INTO prophet_stories (
    id, title, title_arabic, introduction, conclusion, moral_lesson,
    category, difficulty, age_recommendation, reading_time, word_count,
    chronological_order, historical_period_start, historical_period_end,
    historical_location, historical_context,
    is_premium, has_interactive_elements, created_at
) VALUES (
    'revelation_details',
    'Les Détails de la Première Révélation',
    'تفاصيل نزول الوحي الأول',
    'La première révélation dans la grotte de Hira fut un moment décisif dans l''histoire de l''humanité. Cette nuit bénie du mois de Ramadan, l''Ange Jibril (Gabriel) descendit avec les premiers versets du Coran, marquant le début de la mission prophétique. Mais cette révélation ne se fit pas sans épreuves et questionnements.',
    'La première révélation marqua le début d''une nouvelle ère pour l''humanité. Le Prophète Mohammad (ﷺ) venait de recevoir la mission la plus importante de l''histoire : transmettre le message d''Allah à toute l''humanité. Cette révélation allait transformer le monde et guider des milliards de personnes vers la vérité.',
    'La première révélation nous enseigne que la connaissance et la lecture sont les fondements de la foi, que la révélation divine est une bénédiction qui transforme les vies, et que chaque croyant a la responsabilité de transmettre le message d''Allah.',
    'revelation',
    'intermediate',
    12,
    10,
    1200,
    5,
    1,
    1,
    'Grotte de Hira, La Mecque',
    'Début de la mission prophétique, première révélation du Coran',
    FALSE,
    TRUE,
    NOW()
);

-- Chapitres de la révélation détaillée
INSERT INTO prophet_story_chapters (id, story_id, title, content, chapter_order, reading_time) VALUES
('revelation_chapter_1', 'revelation_details', 'La Nuit du Destin',
'Dans la solitude de la grotte de Hira, Mohammad (ﷺ) méditait profondément sur le sens de la vie et l''existence d''Allah. Il avait quarante ans et passait de plus en plus de temps dans cette grotte, cherchant la vérité et fuyant l''idolâtrie de son peuple.

Cette nuit-là, alors qu''il était plongé dans ses méditations, l''Ange Jibril (عليه السلام) lui apparut sous sa forme angélique véritable. L''ange était immense, remplissant tout l''espace de la grotte, et sa lumière était si intense qu''elle illuminait tout autour.

Jibril dit : "Lis !" (Iqra!) Mohammad (ﷺ) répondit : "Je ne sais pas lire." L''ange répéta : "Lis !" Mohammad (ﷺ) répondit encore : "Je ne sais pas lire." L''ange répéta une troisième fois, puis récita les premiers versets du Coran.', 1, 3),

('revelation_chapter_2', 'revelation_details', 'Les Premiers Versets',
'L''Ange Jibril récita les premiers versets de la sourate Al-Alaq :

"Lis, au nom de ton Seigneur qui a créé, qui a créé l''homme d''une adhérence. Lis ! Ton Seigneur est le Très Noble, qui a enseigné par la plume, a enseigné à l''homme ce qu''il ne savait pas."

Ces versets marquaient le début de la révélation du Coran, le livre saint de l''Islam. Ils soulignaient l''importance de la lecture, de l''apprentissage et de la connaissance, fondements de la foi musulmane.

Mohammad (ﷺ) répéta ces versets après l''ange, puis l''ange disparut. Le Prophète (ﷺ) était profondément bouleversé par cette expérience extraordinaire.', 2, 3),

('revelation_chapter_3', 'revelation_details', 'Le Retour à La Mecque',
'Mohammad (ﷺ) descendit de la grotte, tremblant et bouleversé par ce qu''il venait de vivre. Il se rendit chez Khadijah (رضي الله عنها) et lui dit : "Couvrez-moi, couvrez-moi !"

Khadijah le couvrit et resta à ses côtés jusqu''à ce qu''il se calme. Puis il lui raconta tout ce qui s''était passé. Khadijah, avec sa sagesse et sa foi, le rassura : "Par Allah, Allah ne t''humiliera jamais. Tu maintiens les liens de parenté, tu portes le fardeau des faibles, tu donnes aux pauvres, tu héberges l''hôte, et tu secours les victimes de l''injustice."

Elle l''emmena voir son cousin Waraqah ibn Nawfal, un érudit chrétien qui connaissait les Écritures. Waraqah confirma : "C''est le même ange qui est venu à Moïse. Tu seras le prophète de cette communauté."', 3, 2),

('revelation_chapter_4', 'revelation_details', 'La Période d''Interruption',
'Pendant quelque temps, la révélation s''interrompit. Mohammad (ﷺ) commença à douter et à se demander s''il avait vraiment reçu une révélation divine ou s''il avait été trompé par des djinns.

Cette période d''interruption fut une épreuve pour le Prophète (ﷺ). Il retournait souvent à la grotte de Hira, espérant revoir l''ange. Mais l''ange ne revenait pas, et Mohammad (ﷺ) se sentait abandonné.

Finalement, l''Ange Jibril réapparut et récita les premiers versets de la sourate Ad-Duha, rassurant le Prophète (ﷺ) : "Par l''aube ! Et par les dix nuits ! Ton Seigneur ne t''a ni abandonné, ni détesté. La vie dernière t''est, certes, meilleure que la vie présente. Ton Seigneur t''accordera certes [ses faveurs], et alors tu seras satisfait."', 4, 2);

-- Références islamiques pour toutes les histoires
INSERT INTO prophet_story_references (story_id, type, source, reference_text, authenticity, content, translation, relevance, reference_order) VALUES
-- Références pour l'enfance
('childhood_mecca', 'hadith', 'Sahih Muslim', 'Hadith rapporté par Halimah', 'sahih',
'عن حليمة السعدية قالت: أخذته فوضعته في حجري، فما رأيت صبياً قط أنفع منه',
'Halimah as-Sa''diyyah a dit : "Je l''ai pris et l''ai mis dans mes bras, et je n''ai jamais vu un enfant plus bénéfique que lui"',
'Témoigne des bénédictions qui accompagnèrent l''enfance du Prophète', 1),

-- Références pour le mariage
('marriage_khadijah', 'hadith', 'Sahih Bukhari', 'Hadith rapporté par Aisha', 'sahih',
'عن عائشة رضي الله عنها قالت: ما غرت على امرأة ما غرت على خديجة',
'Aisha (رضي الله عنها) a dit : "Je n''ai jamais été jalouse d''une femme comme je l''ai été de Khadijah"',
'Montre l''amour et le respect du Prophète pour Khadijah', 1),

-- Références pour la Kaaba
('kaaba_reconstruction', 'hadith', 'Sahih Bukhari', 'Hadith sur la reconstruction', 'sahih',
'عن ابن عباس قال: كان النبي صلى الله عليه وسلم يحمل الحجارة مع قريش',
'Ibn Abbas a dit : "Le Prophète (ﷺ) portait des pierres avec les Quraychites"',
'Confirme la participation du Prophète à la reconstruction', 1),

-- Références pour la révélation
('revelation_details', 'quran', 'Sourate Al-Alaq', 'Coran 96:1-5', 'sahih',
'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ. خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ. اقْرَأْ وَرَبُّكَ الْأَكْرَمُ. الَّذِي عَلَّمَ بِالْقَلَمِ. عَلَّمَ الْإِنسَانَ مَا لَمْ يَعْلَمْ',
'Lis, au nom de ton Seigneur qui a créé, qui a créé l''homme d''une adhérence. Lis ! Ton Seigneur est le Très Noble, qui a enseigné par la plume, a enseigné à l''homme ce qu''il ne savait pas',
'Les premiers versets révélés au Prophète', 1);

-- Glossaire pour les nouvelles histoires
INSERT INTO prophet_story_glossary (story_id, term, arabic_term, definition, pronunciation, category) VALUES
-- Glossaire pour l'enfance
('childhood_mecca', 'Halimah as-Sa''diyyah', 'حليمة السعدية', 'Nourrice bédouine du Prophète Mohammad (ﷺ) de la tribu des Banou Sa''d', 'ha-li-ma as-sa-di-yah', 'personnages'),
('childhood_mecca', 'Abd al-Muttalib', 'عبد المطلب', 'Grand-père paternel du Prophète Mohammad (ﷺ), chef de la tribu des Banou Hachim', 'abd al-mut-ta-lib', 'personnages'),
('childhood_mecca', 'Abu Talib', 'أبو طالب', 'Oncle paternel du Prophète Mohammad (ﷺ) qui l''éleva après la mort de son grand-père', 'a-bou ta-lib', 'personnages'),

-- Glossaire pour le mariage
('marriage_khadijah', 'Khadijah bint Khuwaylid', 'خديجة بنت خويلد', 'Première épouse du Prophète Mohammad (ﷺ), première personne à croire en sa mission', 'kha-di-ja bint khu-way-lid', 'personnages'),
('marriage_khadijah', 'Al-Amin', 'الأمين', 'Surnom du Prophète Mohammad (ﷺ) signifiant "le Digne de Confiance"', 'al-a-min', 'titles'),
('marriage_khadijah', 'As-Sadiq', 'الصادق', 'Surnom du Prophète Mohammad (ﷺ) signifiant "le Véridique"', 'as-sa-diq', 'titles'),

-- Glossaire pour la Kaaba
('kaaba_reconstruction', 'Al-Hajar al-Aswad', 'الحجر الأسود', 'Pierre noire sacrée encastrée dans un coin de la Kaaba', 'al-ha-jar al-as-wad', 'lieux'),
('kaaba_reconstruction', 'Quraychites', 'قريش', 'Tribu dominante de La Mecque à laquelle appartenait le Prophète Mohammad (ﷺ)', 'qu-ray-ch', 'tribus'),

-- Glossaire pour la révélation
('revelation_details', 'Jibril', 'جبريل', 'Ange Gabriel, messager d''Allah chargé de transmettre les révélations', 'jib-ril', 'angels'),
('revelation_details', 'Iqra', 'اقرأ', 'Premier mot révélé au Prophète, signifiant "Lis !"', 'iq-ra', 'commands'),
('revelation_details', 'Waraqah ibn Nawfal', 'ورقة بن نوفل', 'Cousin chrétien de Khadijah, érudit qui reconnut la prophétie de Mohammad (ﷺ)', 'wa-ra-qa ibn naw-fal', 'personnages');
