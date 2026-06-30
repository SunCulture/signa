import type { Locale } from "./config";

export type AppDictionary = {
  common: {
    back: string;
    cancel: string;
    deleteAnyway: string;
    deleting: string;
    keepMyAccount: string;
    learnMore: string;
    requestFailed: string;
    settings: string;
    signOut: string;
    testMode: string;
    update: string;
    updating: string;
    upgrade: string;
  };
  userMenu: {
    askAi: string;
    profile: string;
    testMode: string;
    verifyPdf: string;
    workspace: string;
  };
  settings: {
    help: string;
    nav: {
      account: string;
      api: string;
      eSignature: string;
      embedding: string;
      integrations: string;
      notifications: string;
      personalization: string;
      plans: string;
      profile: string;
      teams: string;
      users: string;
      webhooks: string;
    };
    license: string;
  };
  account: {
    companyName: string;
    compliance: string;
    dangerZone: string;
    deleteAccount: string;
    deleteDescription: string;
    deleteTitle: string;
    language: string;
    loadedError: string;
    preferenceFailed: string;
    preferenceUpdated: string;
    preferences: string;
    savedDescription: string;
    title: string;
    timeZone: string;
    updateFailed: string;
    updated: string;
  };
  templates: {
    actions: {
      active: string;
      addFromGoogleDrive: string;
      archive: string;
      archived: string;
      cancel: string;
      changeFolder: string;
      clone: string;
      create: string;
      delete: string;
      deleteFolderAndDocuments: string;
      deleteFolderOnly: string;
      download: string;
      edit: string;
      move: string;
      moveSubmit: string;
      newFolder: string;
      rename: string;
      restore: string;
      signNow: string;
      submit: string;
      upload: string;
      view: string;
    };
    create: {
      documentName: string;
      googleDrive: string;
      title: string;
      upload: string;
    };
    dialogs: {
      cloneTitle: string;
      createFolderDescription: string;
      createFolderInside: string;
      createFolderTitle: string;
      deleteFolderDescription: string;
      deleteFolderTitle: string;
      moveTitle: string;
      renameFolderDescription: string;
      renameFolderTitle: string;
      selectTeamAccount: string;
    };
    empty: {
      archivedSubmissions: string;
      archivedTemplates: string;
      folderEmpty: string;
      folderEmptyDescription: string;
      noSubmissions: string;
      noSubmissionsDescription: string;
      noTemplates: string;
      noTemplatesDescription: string;
      submissionsNotFound: string;
      templatesNotFound: string;
    };
    folder: {
      default: string;
      folders: string;
      foldersCount: string;
      namePlaceholder: string;
      newNamePlaceholder: string;
      noFoldersFound: string;
      templates: string;
      templatesCount: string;
    };
    search: {
      submissions: string;
      templates: string;
    };
    status: {
      archived: string;
      completed: string;
      declined: string;
      expired: string;
      opened: string;
      pending: string;
    };
    titles: {
      archivedSubmissions: string;
      archivedTemplates: string;
      documentTemplates: string;
      submissions: string;
    };
      toasts: {
        archiveFailed: string;
      cloneFailed: string;
      cloned: string;
      createFailed: string;
      created: string;
        documentUploaded: string;
        deleteFailed: string;
        driveImportFailed: string;
      driveImported: string;
      driveNoFiles: string;
      folderCreateFailed: string;
      folderCreated: string;
      folderDeleteFailed: string;
      folderDeleted: string;
      folderDeletedWithContents: string;
      folderOnlyDeleted: string;
      folderRenameFailed: string;
      folderRenamed: string;
      loadingFailed: string;
      moveFailed: string;
      moved: string;
      openingDrive: string;
      openingEditor: string;
      preparingUpload: string;
      restoreFailed: string;
      restored: string;
      submissionArchiveFailed: string;
      submissionArchived: string;
      templateArchived: string;
      templateDeleted: string;
      uploadFailed: string;
      uploadingDocument: string;
    };
    uploadDropzone: {
      body: string;
      drive: string;
      openingDrive: string;
      orAddFrom: string;
      title: string;
    };
  };
  preferences: Record<string, { label: string; tooltip: string }>;
  compliance: Record<
    string,
    { description: string; label: string; tooltip: string }
  >;
};

export const appDictionaries: Record<Locale, AppDictionary> = {
  en: {
    common: {
      back: "Back",
      cancel: "Cancel",
      deleteAnyway: "Delete Anyway",
      deleting: "Deleting",
      keepMyAccount: "Keep My Account",
      learnMore: "Learn more",
      requestFailed: "Something went wrong. Please try again.",
      settings: "Settings",
      signOut: "Sign out",
      testMode: "Test mode",
      update: "UPDATE",
      updating: "UPDATING",
      upgrade: "UPGRADE",
    },
    userMenu: {
      askAi: "Ask AI",
      profile: "Profile",
      testMode: "Test mode",
      verifyPdf: "Verify PDF",
      workspace: "Workspace",
    },
    settings: {
      help: "Need help? Ask a question:",
      license: "License",
      nav: {
        account: "Account",
        api: "API",
        eSignature: "E-Signature",
        embedding: "Embedding",
        integrations: "Integrations",
        notifications: "Notifications",
        personalization: "Personalization",
        plans: "Plans",
        profile: "Profile",
        teams: "Teams",
        users: "Users",
        webhooks: "Webhooks",
      },
    },
    account: {
      companyName: "Company name",
      compliance: "Compliance",
      dangerZone: "Danger Zone",
      deleteAccount: "DELETE MY ACCOUNT",
      deleteDescription:
        "This archives your account and locks the current user. You will be signed out immediately.",
      deleteTitle: "Delete your account?",
      language: "Language",
      loadedError: "Account settings could not be loaded",
      preferenceFailed: "Preference update failed",
      preferenceUpdated: "Preference updated",
      preferences: "Preferences",
      savedDescription: "Your account settings have been saved.",
      title: "Account",
      timeZone: "Time zone",
      updateFailed: "Account update failed",
      updated: "Account updated",
    },
    templates: {
      actions: {
        active: "ACTIVE",
        addFromGoogleDrive: "ADD FROM GOOGLE DRIVE",
        archive: "Archive",
        archived: "ARCHIVED",
        cancel: "Cancel",
        changeFolder: "Change Folder",
        clone: "Clone",
        create: "CREATE",
        delete: "Delete",
        deleteFolderAndDocuments: "Delete folder and documents",
        deleteFolderOnly: "Delete folder only",
        download: "DOWNLOAD",
        edit: "Edit",
        move: "Move",
        moveSubmit: "MOVE",
        newFolder: "NEW FOLDER",
        rename: "Rename",
        restore: "Restore",
        signNow: "SIGN NOW",
        submit: "SUBMIT",
        upload: "UPLOAD",
        view: "VIEW",
      },
      create: {
        documentName: "Document Name",
        googleDrive: "Google Drive",
        title: "New Document Template",
        upload: "Upload",
      },
      dialogs: {
        cloneTitle: "Clone Template",
        createFolderDescription:
          "Create a folder next to your default templates.",
        createFolderInside: "Create a folder inside {folder}.",
        createFolderTitle: "Create folder",
        deleteFolderDescription:
          "Choose whether to keep the documents by moving them to Default, or archive the folder together with its documents and subfolders.",
        deleteFolderTitle: "Delete folder?",
        moveTitle: "Move Into Folder",
        renameFolderDescription: "Rename {folder}.",
        renameFolderTitle: "Rename Folder",
        selectTeamAccount: "Select team account",
      },
      empty: {
        archivedSubmissions: "No archived submissions",
        archivedTemplates: "No archived templates",
        folderEmpty: "This folder is empty",
        folderEmptyDescription:
          "Create a blank template, upload a document, or create a subfolder here.",
        noSubmissions: "No submissions yet",
        noSubmissionsDescription:
          "Send a template to recipients and submissions will appear here.",
        noTemplates: "No templates yet",
        noTemplatesDescription:
          "Create a blank template or upload a PDF/DOCX to start building.",
        submissionsNotFound: "Submissions not found",
        templatesNotFound: "Templates not found",
      },
      folder: {
        default: "Default",
        folders: "Folders",
        foldersCount: "{count} folders",
        namePlaceholder: "Folder name",
        newNamePlaceholder: "New Folder Name...",
        noFoldersFound: "No folders found",
        templates: "Templates",
        templatesCount: "{count} templates",
      },
      search: {
        submissions: "Search submissions",
        templates: "Search templates",
      },
      status: {
        archived: "Archived",
        completed: "Completed",
        declined: "Declined",
        expired: "Expired",
        opened: "Opened",
        pending: "Pending",
      },
      titles: {
        archivedSubmissions: "Archived Submissions",
        archivedTemplates: "Archived Templates",
        documentTemplates: "Document Templates",
        submissions: "Submissions",
      },
      toasts: {
        archiveFailed: "Template archive failed",
        cloneFailed: "Template clone failed",
        cloned: "Template cloned",
        createFailed: "Template create failed",
        created: "Template created",
        documentUploaded: "Document uploaded",
        deleteFailed: "Template delete failed",
        driveImportFailed: "Google Drive import failed",
        driveImported: "Google Drive document imported",
        driveNoFiles: "No Google Drive files selected",
        folderCreateFailed: "Folder create failed",
        folderCreated: "Folder created",
        folderDeleteFailed: "Folder delete failed",
        folderDeleted: "Folder deleted",
        folderDeletedWithContents: "Folder and documents were archived.",
        folderOnlyDeleted: "Documents were moved to Default.",
        folderRenameFailed: "Folder rename failed",
        folderRenamed: "Folder renamed",
        loadingFailed: "Templates could not be loaded",
        moveFailed: "Template move failed",
        moved: "Template moved",
        openingDrive: "Opening Google Drive",
        openingEditor: "Opening template editor.",
        preparingUpload: "Preparing {file}...",
        restoreFailed: "Template restore failed",
        restored: "Template restored",
        submissionArchiveFailed: "Submission archive failed",
        submissionArchived: "Submission archived",
        templateArchived: "Template archived",
        templateDeleted: "Template deleted",
        uploadFailed: "Document upload failed",
        uploadingDocument: "Uploading document",
      },
      uploadDropzone: {
        body: "Click to upload or drag and drop",
        drive: "Google Drive",
        openingDrive: "Opening Google Drive...",
        orAddFrom: "Or add from",
        title: "Upload a New Document",
      },
    },
    preferences: {
      force_mfa: {
        label: "Force 2FA with Authenticator App",
        tooltip: "Require team members to use two-factor authentication.",
      },
      with_signature_id: {
        label: "Add signature ID to the documents",
        tooltip: "Add a unique signature ID and timestamp to each signature.",
      },
      require_signing_reason: {
        label: "Require signing reason",
        tooltip:
          "Ask signers to provide a reason before completing a signature.",
      },
      allow_typed_signature: {
        label: "Allow typed text signatures",
        tooltip: "Allow signers to type their signature instead of drawing it.",
      },
      allow_to_resubmit: {
        label: "Allow to resubmit completed forms",
        tooltip: "Allow recipients to submit a completed shared form again.",
      },
      allow_to_decline: {
        label: "Allow to decline documents",
        tooltip: "Allow recipients to decline a signature request.",
      },
      allow_to_delegate: {
        label: "Allow to delegate documents",
        tooltip: "Allow recipients to delegate signing to another person.",
      },
      form_prefill_signature: {
        label: "Remember and pre-fill signatures",
        tooltip: "Reuse saved signature data where the signer is recognized.",
      },
      download_links_expire: {
        label: "Expirable file download links",
        tooltip: "Generate document download links with an expiration window.",
      },
      download_links_auth: {
        label: "Require authentication for file download links",
        tooltip:
          "Require authentication before generated document links can be opened.",
      },
      combine_pdf_result_key: {
        label: "Combine completed documents and Audit Log",
        tooltip:
          "Generate one combined result containing signed documents and audit log.",
      },
    },
    compliance: {
      hipaa: {
        description: "Sign BAA to enter a HIPAA compliance agreement.",
        label: "HIPAA",
        tooltip:
          "Track whether HIPAA compliance mode is enabled for this account.",
      },
      cfr_part_11: {
        description: "Enable 21 CFR Part 11 compliance features.",
        label: "21 CFR Part 11",
        tooltip: "Enable controls aligned with 21 CFR Part 11 workflows.",
      },
      knowledge_based_authentication: {
        description: "Enable Knowledge-based authentication.",
        label: "Knowledge-based Authentication",
        tooltip: "Require identity verification questions before signing.",
      },
    },
  },
  sw: {
    common: {
      back: "Rudi",
      cancel: "Ghairi",
      deleteAnyway: "Futa Hata Hivyo",
      deleting: "Inafuta",
      keepMyAccount: "Hifadhi Akaunti",
      learnMore: "Jifunze zaidi",
      requestFailed: "Hitilafu imetokea. Tafadhali jaribu tena.",
      settings: "Mipangilio",
      signOut: "Toka",
      testMode: "Hali ya majaribio",
      update: "SASISHA",
      updating: "INASASISHA",
      upgrade: "BORESHA",
    },
    userMenu: {
      askAi: "Uliza AI",
      profile: "Wasifu",
      testMode: "Hali ya majaribio",
      verifyPdf: "Thibitisha PDF",
      workspace: "Nafasi ya kazi",
    },
    settings: {
      help: "Unahitaji msaada? Uliza swali:",
      license: "Leseni",
      nav: {
        account: "Akaunti",
        api: "API",
        eSignature: "Sahihi ya kielektroniki",
        embedding: "Upachikaji",
        integrations: "Miunganisho",
        notifications: "Arifa",
        personalization: "Ubinafsishaji",
        plans: "Mipango",
        profile: "Wasifu",
        teams: "Timu",
        users: "Watumiaji",
        webhooks: "Webhooks",
      },
    },
    account: {
      companyName: "Jina la kampuni",
      compliance: "Uzingatiaji",
      dangerZone: "Eneo la Hatari",
      deleteAccount: "FUTA AKAUNTI YANGU",
      deleteDescription:
        "Hii itaweka akaunti kwenye kumbukumbu na kumfungia mtumiaji wa sasa. Utaondolewa mara moja.",
      deleteTitle: "Ungependa kufuta akaunti yako?",
      language: "Lugha",
      loadedError: "Mipangilio ya akaunti haikuweza kupakiwa",
      preferenceFailed: "Kusasisha mpangilio kumeshindikana",
      preferenceUpdated: "Mpangilio umesasishwa",
      preferences: "Mapendeleo",
      savedDescription: "Mipangilio ya akaunti yako imehifadhiwa.",
      title: "Akaunti",
      timeZone: "Saa za eneo",
      updateFailed: "Kusasisha akaunti kumeshindikana",
      updated: "Akaunti imesasishwa",
    },
    templates: {
      actions: {
        active: "ZINAZOTUMIKA",
        addFromGoogleDrive: "ONGEZA KUTOKA GOOGLE DRIVE",
        archive: "Weka kumbukumbu",
        archived: "KUMBUKUMBU",
        cancel: "Ghairi",
        changeFolder: "Badilisha Folda",
        clone: "Nakili",
        create: "UNDA",
        delete: "Futa",
        deleteFolderAndDocuments: "Futa folda na hati",
        deleteFolderOnly: "Futa folda pekee",
        download: "PAKUA",
        edit: "Hariri",
        move: "Hamisha",
        moveSubmit: "HAMISHA",
        newFolder: "FOLDA MPYA",
        rename: "Badili jina",
        restore: "Rejesha",
        signNow: "SAINI SASA",
        submit: "WASILISHA",
        upload: "PAKIA",
        view: "TAZAMA",
      },
      create: {
        documentName: "Jina la Hati",
        googleDrive: "Google Drive",
        title: "Kiolezo Kipya cha Hati",
        upload: "Pakia",
      },
      dialogs: {
        cloneTitle: "Nakili Kiolezo",
        createFolderDescription:
          "Unda folda karibu na violezo vyako vya msingi.",
        createFolderInside: "Unda folda ndani ya {folder}.",
        createFolderTitle: "Unda folda",
        deleteFolderDescription:
          "Chagua kuhifadhi hati kwa kuzihamisha hadi Default, au kuweka folda pamoja na hati na folda zake ndogo kwenye kumbukumbu.",
        deleteFolderTitle: "Futa folda?",
        moveTitle: "Hamisha Kwenye Folda",
        renameFolderDescription: "Badili jina la {folder}.",
        renameFolderTitle: "Badili Jina la Folda",
        selectTeamAccount: "Chagua akaunti ya timu",
      },
      empty: {
        archivedSubmissions: "Hakuna mawasilisho kwenye kumbukumbu",
        archivedTemplates: "Hakuna violezo kwenye kumbukumbu",
        folderEmpty: "Folda hii haina kitu",
        folderEmptyDescription:
          "Unda kiolezo tupu, pakia hati, au unda folda ndogo hapa.",
        noSubmissions: "Bado hakuna mawasilisho",
        noSubmissionsDescription:
          "Tuma kiolezo kwa wapokeaji na mawasilisho yataonekana hapa.",
        noTemplates: "Bado hakuna violezo",
        noTemplatesDescription:
          "Unda kiolezo tupu au pakia PDF/DOCX kuanza kujenga.",
        submissionsNotFound: "Mawasilisho hayakupatikana",
        templatesNotFound: "Violezo havikupatikana",
      },
      folder: {
        default: "Default",
        folders: "Folda",
        foldersCount: "folda {count}",
        namePlaceholder: "Jina la folda",
        newNamePlaceholder: "Jina Jipya la Folda...",
        noFoldersFound: "Hakuna folda zilizopatikana",
        templates: "Violezo",
        templatesCount: "violezo {count}",
      },
      search: {
        submissions: "Tafuta mawasilisho",
        templates: "Tafuta violezo",
      },
      status: {
        archived: "Kumbukumbu",
        completed: "Imekamilika",
        declined: "Imekataliwa",
        expired: "Imeisha muda",
        opened: "Imefunguliwa",
        pending: "Inasubiri",
      },
      titles: {
        archivedSubmissions: "Mawasilisho ya Kumbukumbu",
        archivedTemplates: "Violezo vya Kumbukumbu",
        documentTemplates: "Violezo vya Hati",
        submissions: "Mawasilisho",
      },
      toasts: {
        archiveFailed: "Kuweka kiolezo kwenye kumbukumbu kumeshindikana",
        cloneFailed: "Kunakili kiolezo kumeshindikana",
        cloned: "Kiolezo kimenakiliwa",
        createFailed: "Kuunda kiolezo kumeshindikana",
        created: "Kiolezo kimeundwa",
        documentUploaded: "Hati imepakiwa",
        deleteFailed: "Kufuta kiolezo kumeshindikana",
        driveImportFailed: "Uingizaji wa Google Drive umeshindikana",
        driveImported: "Hati ya Google Drive imeingizwa",
        driveNoFiles: "Hakuna faili za Google Drive zilizochaguliwa",
        folderCreateFailed: "Kuunda folda kumeshindikana",
        folderCreated: "Folda imeundwa",
        folderDeleteFailed: "Kufuta folda kumeshindikana",
        folderDeleted: "Folda imefutwa",
        folderDeletedWithContents: "Folda na hati zimewekwa kumbukumbu.",
        folderOnlyDeleted: "Hati zimehamishwa hadi Default.",
        folderRenameFailed: "Kubadili jina la folda kumeshindikana",
        folderRenamed: "Jina la folda limebadilishwa",
        loadingFailed: "Violezo havikuweza kupakiwa",
        moveFailed: "Kuhamisha kiolezo kumeshindikana",
        moved: "Kiolezo kimehamishwa",
        openingDrive: "Inafungua Google Drive",
        openingEditor: "Inafungua kihariri cha kiolezo.",
        preparingUpload: "Inaandaa {file}...",
        restoreFailed: "Kurejesha kiolezo kumeshindikana",
        restored: "Kiolezo kimerejeshwa",
        submissionArchiveFailed: "Kuweka wasilisho kwenye kumbukumbu kumeshindikana",
        submissionArchived: "Wasilisho limewekwa kumbukumbu",
        templateArchived: "Kiolezo kimewekwa kumbukumbu",
        templateDeleted: "Kiolezo kimefutwa",
        uploadFailed: "Kupakia hati kumeshindikana",
        uploadingDocument: "Inapakia hati",
      },
      uploadDropzone: {
        body: "Bofya kupakia au buruta na uangushe",
        drive: "Google Drive",
        openingDrive: "Inafungua Google Drive...",
        orAddFrom: "Au ongeza kutoka",
        title: "Pakia Hati Mpya",
      },
    },
    preferences: {
      force_mfa: {
        label: "Lazimisha 2FA kwa programu ya uthibitishaji",
        tooltip:
          "Wahitaji washiriki wa timu kutumia uthibitishaji wa hatua mbili.",
      },
      with_signature_id: {
        label: "Ongeza kitambulisho cha sahihi kwenye hati",
        tooltip:
          "Ongeza kitambulisho cha kipekee cha sahihi na muda kwenye kila sahihi.",
      },
      require_signing_reason: {
        label: "Hitaji sababu ya kusaini",
        tooltip: "Waombe wasaini kutoa sababu kabla ya kukamilisha sahihi.",
      },
      allow_typed_signature: {
        label: "Ruhusu sahihi zilizoandikwa",
        tooltip: "Ruhusu wasaini kuandika sahihi badala ya kuchora.",
      },
      allow_to_resubmit: {
        label: "Ruhusu kutuma tena fomu zilizokamilika",
        tooltip: "Ruhusu wapokeaji kutuma tena fomu iliyokamilika.",
      },
      allow_to_decline: {
        label: "Ruhusu kukataa hati",
        tooltip: "Ruhusu wapokeaji kukataa ombi la sahihi.",
      },
      allow_to_delegate: {
        label: "Ruhusu kukabidhi hati",
        tooltip: "Ruhusu wapokeaji kukabidhi kusaini kwa mtu mwingine.",
      },
      form_prefill_signature: {
        label: "Kumbuka na jaza sahihi mapema",
        tooltip:
          "Tumia tena data ya sahihi iliyohifadhiwa pale msaini anatambulika.",
      },
      download_links_expire: {
        label: "Viungo vya kupakua vinavyoisha muda",
        tooltip: "Tengeneza viungo vya hati vyenye muda wa mwisho.",
      },
      download_links_auth: {
        label: "Hitaji uthibitishaji kwa viungo vya kupakua",
        tooltip: "Hitaji kuingia kabla ya kufungua viungo vya hati.",
      },
      combine_pdf_result_key: {
        label: "Unganisha hati zilizokamilika na kumbukumbu ya ukaguzi",
        tooltip:
          "Tengeneza faili moja lenye hati zilizosainiwa na kumbukumbu ya ukaguzi.",
      },
    },
    compliance: {
      hipaa: {
        description: "Saini BAA ili kuingia makubaliano ya HIPAA.",
        label: "HIPAA",
        tooltip: "Fuatilia kama hali ya HIPAA imewezeshwa kwa akaunti hii.",
      },
      cfr_part_11: {
        description: "Washa vipengele vya 21 CFR Part 11.",
        label: "21 CFR Part 11",
        tooltip: "Washa udhibiti unaoendana na mchakato wa 21 CFR Part 11.",
      },
      knowledge_based_authentication: {
        description: "Washa uthibitishaji kwa maswali ya maarifa.",
        label: "Uthibitishaji wa Maarifa",
        tooltip: "Hitaji maswali ya utambulisho kabla ya kusaini.",
      },
    },
  },
  fr: {
    common: {
      back: "Retour",
      cancel: "Annuler",
      deleteAnyway: "Supprimer quand même",
      deleting: "Suppression",
      keepMyAccount: "Garder mon compte",
      learnMore: "En savoir plus",
      requestFailed: "Une erreur est survenue. Veuillez réessayer.",
      settings: "Paramètres",
      signOut: "Déconnexion",
      testMode: "Mode test",
      update: "METTRE À JOUR",
      updating: "MISE À JOUR",
      upgrade: "METTRE À NIVEAU",
    },
    userMenu: {
      askAi: "Demander à l'IA",
      profile: "Profil",
      testMode: "Mode test",
      verifyPdf: "Vérifier le PDF",
      workspace: "Espace de travail",
    },
    settings: {
      help: "Besoin d'aide ? Posez une question :",
      license: "Licence",
      nav: {
        account: "Compte",
        api: "API",
        eSignature: "Signature électronique",
        embedding: "Intégration",
        integrations: "Connexions",
        notifications: "Notifications",
        personalization: "Personnalisation",
        plans: "Offres",
        profile: "Profil",
        teams: "Équipes",
        users: "Utilisateurs",
        webhooks: "Webhooks",
      },
    },
    account: {
      companyName: "Nom de l'entreprise",
      compliance: "Conformité",
      dangerZone: "Zone de danger",
      deleteAccount: "SUPPRIMER MON COMPTE",
      deleteDescription:
        "Cela archive votre compte et bloque l'utilisateur actuel. Vous serez déconnecté immédiatement.",
      deleteTitle: "Supprimer votre compte ?",
      language: "Langue",
      loadedError: "Impossible de charger les paramètres du compte",
      preferenceFailed: "La mise à jour de la préférence a échoué",
      preferenceUpdated: "Préférence mise à jour",
      preferences: "Préférences",
      savedDescription: "Les paramètres de votre compte ont été enregistrés.",
      title: "Compte",
      timeZone: "Fuseau horaire",
      updateFailed: "La mise à jour du compte a échoué",
      updated: "Compte mis à jour",
    },
    templates: {
      actions: {
        active: "ACTIFS",
        addFromGoogleDrive: "AJOUTER DEPUIS GOOGLE DRIVE",
        archive: "Archiver",
        archived: "ARCHIVÉS",
        cancel: "Annuler",
        changeFolder: "Changer de dossier",
        clone: "Cloner",
        create: "CRÉER",
        delete: "Supprimer",
        deleteFolderAndDocuments: "Supprimer le dossier et les documents",
        deleteFolderOnly: "Supprimer le dossier seulement",
        download: "TÉLÉCHARGER",
        edit: "Modifier",
        move: "Déplacer",
        moveSubmit: "DÉPLACER",
        newFolder: "NOUVEAU DOSSIER",
        rename: "Renommer",
        restore: "Restaurer",
        signNow: "SIGNER",
        submit: "VALIDER",
        upload: "IMPORTER",
        view: "VOIR",
      },
      create: {
        documentName: "Nom du document",
        googleDrive: "Google Drive",
        title: "Nouveau modèle de document",
        upload: "Importer",
      },
      dialogs: {
        cloneTitle: "Cloner le modèle",
        createFolderDescription:
          "Créer un dossier à côté de vos modèles par défaut.",
        createFolderInside: "Créer un dossier dans {folder}.",
        createFolderTitle: "Créer un dossier",
        deleteFolderDescription:
          "Choisissez de conserver les documents en les déplaçant vers Default, ou d'archiver le dossier avec ses documents et sous-dossiers.",
        deleteFolderTitle: "Supprimer le dossier ?",
        moveTitle: "Déplacer dans un dossier",
        renameFolderDescription: "Renommer {folder}.",
        renameFolderTitle: "Renommer le dossier",
        selectTeamAccount: "Sélectionner un compte d'équipe",
      },
      empty: {
        archivedSubmissions: "Aucune soumission archivée",
        archivedTemplates: "Aucun modèle archivé",
        folderEmpty: "Ce dossier est vide",
        folderEmptyDescription:
          "Créez un modèle vide, importez un document ou créez un sous-dossier ici.",
        noSubmissions: "Aucune soumission pour le moment",
        noSubmissionsDescription:
          "Envoyez un modèle à des destinataires et les soumissions apparaîtront ici.",
        noTemplates: "Aucun modèle pour le moment",
        noTemplatesDescription:
          "Créez un modèle vide ou importez un PDF/DOCX pour commencer.",
        submissionsNotFound: "Soumissions introuvables",
        templatesNotFound: "Modèles introuvables",
      },
      folder: {
        default: "Default",
        folders: "Dossiers",
        foldersCount: "{count} dossiers",
        namePlaceholder: "Nom du dossier",
        newNamePlaceholder: "Nouveau nom de dossier...",
        noFoldersFound: "Aucun dossier trouvé",
        templates: "Modèles",
        templatesCount: "{count} modèles",
      },
      search: {
        submissions: "Rechercher des soumissions",
        templates: "Rechercher des modèles",
      },
      status: {
        archived: "Archivé",
        completed: "Terminé",
        declined: "Refusé",
        expired: "Expiré",
        opened: "Ouvert",
        pending: "En attente",
      },
      titles: {
        archivedSubmissions: "Soumissions archivées",
        archivedTemplates: "Modèles archivés",
        documentTemplates: "Modèles de document",
        submissions: "Soumissions",
      },
      toasts: {
        archiveFailed: "L'archivage du modèle a échoué",
        cloneFailed: "Le clonage du modèle a échoué",
        cloned: "Modèle cloné",
        createFailed: "La création du modèle a échoué",
        created: "Modèle créé",
        documentUploaded: "Document importé",
        deleteFailed: "La suppression du modèle a échoué",
        driveImportFailed: "L'import Google Drive a échoué",
        driveImported: "Document Google Drive importé",
        driveNoFiles: "Aucun fichier Google Drive sélectionné",
        folderCreateFailed: "La création du dossier a échoué",
        folderCreated: "Dossier créé",
        folderDeleteFailed: "La suppression du dossier a échoué",
        folderDeleted: "Dossier supprimé",
        folderDeletedWithContents:
          "Le dossier et les documents ont été archivés.",
        folderOnlyDeleted: "Les documents ont été déplacés vers Default.",
        folderRenameFailed: "Le renommage du dossier a échoué",
        folderRenamed: "Dossier renommé",
        loadingFailed: "Impossible de charger les modèles",
        moveFailed: "Le déplacement du modèle a échoué",
        moved: "Modèle déplacé",
        openingDrive: "Ouverture de Google Drive",
        openingEditor: "Ouverture de l'éditeur de modèle.",
        preparingUpload: "Préparation de {file}...",
        restoreFailed: "La restauration du modèle a échoué",
        restored: "Modèle restauré",
        submissionArchiveFailed: "L'archivage de la soumission a échoué",
        submissionArchived: "Soumission archivée",
        templateArchived: "Modèle archivé",
        templateDeleted: "Modèle supprimé",
        uploadFailed: "L'import du document a échoué",
        uploadingDocument: "Import du document",
      },
      uploadDropzone: {
        body: "Cliquez pour importer ou glissez-déposez",
        drive: "Google Drive",
        openingDrive: "Ouverture de Google Drive...",
        orAddFrom: "Ou ajouter depuis",
        title: "Importer un nouveau document",
      },
    },
    preferences: {
      force_mfa: {
        label: "Forcer la 2FA avec une application d'authentification",
        tooltip:
          "Obliger les membres de l'équipe à utiliser l'authentification à deux facteurs.",
      },
      with_signature_id: {
        label: "Ajouter l'ID de signature aux documents",
        tooltip:
          "Ajouter un ID de signature unique et un horodatage à chaque signature.",
      },
      require_signing_reason: {
        label: "Exiger une raison de signature",
        tooltip:
          "Demander aux signataires une raison avant de finaliser la signature.",
      },
      allow_typed_signature: {
        label: "Autoriser les signatures saisies",
        tooltip:
          "Autoriser les signataires à taper leur signature au lieu de la dessiner.",
      },
      allow_to_resubmit: {
        label: "Autoriser la nouvelle soumission des formulaires terminés",
        tooltip:
          "Autoriser les destinataires à soumettre à nouveau un formulaire terminé.",
      },
      allow_to_decline: {
        label: "Autoriser le refus des documents",
        tooltip:
          "Autoriser les destinataires à refuser une demande de signature.",
      },
      allow_to_delegate: {
        label: "Autoriser la délégation des documents",
        tooltip:
          "Autoriser les destinataires à déléguer la signature à une autre personne.",
      },
      form_prefill_signature: {
        label: "Mémoriser et préremplir les signatures",
        tooltip:
          "Réutiliser les signatures enregistrées lorsque le signataire est reconnu.",
      },
      download_links_expire: {
        label: "Liens de téléchargement expirables",
        tooltip:
          "Générer des liens de téléchargement de documents avec une expiration.",
      },
      download_links_auth: {
        label: "Exiger l'authentification pour télécharger",
        tooltip:
          "Exiger l'authentification avant d'ouvrir les liens de documents.",
      },
      combine_pdf_result_key: {
        label: "Combiner les documents terminés et le journal d'audit",
        tooltip:
          "Générer un résultat combiné avec les documents signés et le journal d'audit.",
      },
    },
    compliance: {
      hipaa: {
        description:
          "Signer un BAA pour conclure un accord de conformité HIPAA.",
        label: "HIPAA",
        tooltip: "Indique si le mode HIPAA est activé pour ce compte.",
      },
      cfr_part_11: {
        description: "Activer les fonctions de conformité 21 CFR Part 11.",
        label: "21 CFR Part 11",
        tooltip: "Activer les contrôles alignés sur les flux 21 CFR Part 11.",
      },
      knowledge_based_authentication: {
        description: "Activer l'authentification fondée sur les connaissances.",
        label: "Authentification par connaissances",
        tooltip:
          "Exiger des questions de vérification d'identité avant la signature.",
      },
    },
  },
};
