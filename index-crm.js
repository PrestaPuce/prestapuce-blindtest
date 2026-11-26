/* ============================================================================
 * index-crm.js — Compte Fidélité CRM, Google Auth, Connexion & Sécurité
 * Application Joueurs - Buz'Ta Puce (v1.315)
 * ============================================================================ */

// ==========================================
// MOTEUR MODALE CRM PROFIL
// ==========================================
window.crmStep = 1;
window.isGoogleAuthMode = false; // Permet de savoir si on vient de Google
window.googleUser = null;
window.googleAvatar = ""; // 🚀 NOUVEAU : On prépare la variable photo

window.openCRMModal = function() {
    var m = document.getElementById('modal-crm-profile');
    if(m) { 
        m.style.display = 'flex'; 
        window.crmStep = 1; 
        window.isGoogleAuthMode = false; // On reset en classique
        window.googleUser = null;
        window.googleAvatar = ""; // 🚀 NOUVEAU : Reset
        window.updateCRM(); 
    }
};

// 🚀 NOUVEAU : LE MOTEUR INTERCEPTEUR GOOGLE
window.startGoogleAuth = function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(function(result) {
        var user = result.user;
        
        // 🚀 SÉCURITÉ : Vérification de l'identité en cas de récupération
        if (window.pendingRecoveryData && window.pendingRecoveryData.uid !== user.uid) {
            alert("⚠️ ERREUR DE SÉCURITÉ\n\nCe compte Google ne correspond pas au propriétaire du pseudo '" + window.pendingRecoveryData.name + "'.\n\nLa récupération a été annulée.");
            window.pendingRecoveryData = null;
            firebase.auth().signOut();
            window.location.reload();
            return;
        }

        // On fouille dans la base de données pour voir s'il est connu
        firebase.database().ref('users_crm/' + user.uid).once('value').then(function(snap) {
            if(snap.exists()) {
                // CAS 1 : JOUEUR EXISTANT -> Connexion instantanée !
                var data = snap.val();
                
                // 🚀 NETTOYAGE : Suppression du profil invité inutile
                if(myUserID.startsWith('u_') && roomRef) roomRef.child('players/' + myUserID).remove();

                player.id = user.uid;
                myUserID = user.uid; // LE FAMEUX BADGE !
                localStorage.setItem('buzz_userId', myUserID);
                
                player.pseudo = data.pseudo || data.firstName;
                window.crmPseudo = player.pseudo; // 🚀 Mémorisation
                
                // 🚀 LIGNES RESTAURÉES POUR L'AVATAR :
                window.googleAvatar = user.photoURL || ""; 
                window.crmAvatar = data.avatar || window.googleAvatar;
                player.avatar = window.crmAvatar;
				// 🚀 INITIALISATION GALERIE (Google)
                if (data.avatarHistory) {
                    window.avatarHistory = data.avatarHistory;
                } else if (window.crmAvatar) {
                    window.avatarHistory = [{ url: window.crmAvatar, isPermanent: true }]; // Photo indélébile
                    firebase.database().ref('users_crm/' + user.uid).update({ avatarHistory: window.avatarHistory });
                } else {
                    window.avatarHistory = [];
                }
                
                alert("🎉 Bon retour parmi nous, " + player.pseudo + " !");
                
                window.closeLoginModal();
                window.closeCRMModal();
                
                // 🚀 CORRECTION DE LA BOUCLE DE RÉCUPÉRATION (GOOGLE)
                if (window.pendingRecoveryData) {
                    myUserID = window.pendingRecoveryData.uid;
                    localStorage.setItem('buzz_userId', myUserID);
                    
                    // On éjecte l'ancien téléphone
                    firebase.database().ref('users_crm/' + myUserID).update({ currentSessionID: window.mySessionID });

                    player = { 
                        pseudo: window.pendingRecoveryData.name, 
                        avatar: window.pendingRecoveryData.avatar, 
                        team: window.pendingRecoveryData.teamName || "Solo", 
                        teamIcon: window.pendingRecoveryData.teamIcon || "" 
                    };
                    // 🚀 RÉCUPÉRATION DU RÔLE DE CAPITAINE
                    isCaptain = window.pendingRecoveryData.isCaptain || false;
                    
                    window.pendingRecoveryData = null; // Purge
                    showReconnectScreen(); // On va direct au buzzer, pas au pseudo !
                } else {
                    // 🚀 VOIE VIP (Google) : On met à jour le jeton et on vérifie si le joueur est déjà dans la salle
                    firebase.database().ref('users_crm/' + user.uid).update({ currentSessionID: window.mySessionID });
                    if (typeof roomRef !== 'undefined' && roomRef) {
                        roomRef.child('players/' + user.uid).once('value').then(roomSnap => {
                            if (roomSnap.exists()) {
                                showReconnectScreen(); // Joueur déjà dans la salle : direct à l'écran de retour !
                            } else {
                                var gamePseudoInput = document.getElementById('input-pseudo');
                                if (gamePseudoInput) gamePseudoInput.value = player.pseudo;
                                navigateTo('step-pseudo');
                            }
                        });
                    } else {
                        var gamePseudoInput = document.getElementById('input-pseudo');
                        if (gamePseudoInput) gamePseudoInput.value = player.pseudo;
                        navigateTo('step-pseudo');
                    }
                }
            } else {
                // CAS 2 : NOUVEAU JOUEUR GOOGLE -> On le dépose à l'étape 2 !
                window.isGoogleAuthMode = true;
                window.googleUser = user;
                
                // Découpage automatique du nom Google (Prénom / Nom)
                var fName = ""; var lName = "";
                if(user.displayName) {
                    var parts = user.displayName.split(' ');
                    fName = parts[0];
                    lName = parts.slice(1).join(' ');
                }
                
                // 🚀 NOUVEAU : Vol silencieux de la photo
                window.googleAvatar = user.photoURL || "";
				window.crmAvatar = window.googleAvatar; // 🚀 Mémorisation Avatar
                
                // Pré-remplissage invisible
                document.getElementById('crm-firstname').value = fName;
                document.getElementById('crm-lastname').value = lName;
                document.getElementById('crm-email').value = user.email;
                document.getElementById('crm-pseudo').value = fName; // 🚀 NOUVEAU : On pré-remplit le pseudo
                
                // On ferme la fenêtre de connexion si elle était ouverte, on ouvre la CRM à l'Étape 2
                window.closeLoginModal();
                var m = document.getElementById('modal-crm-profile');
                if(m) m.style.display = 'flex';
                window.crmStep = 2; // LE SAUT D'ÉTAPE MAGIQUE !
                window.updateCRM();
                
                alert("👋 Bonjour " + fName + " ! Votre compte Google est lié.\nVeuillez juste compléter ces informations pour finaliser votre profil.");
            }
        });
    }).catch(function(error) {
        console.error("Erreur Google:", error);
        window.showCRMError("Erreur Google : " + error.message);
    });
};

window.closeCRMModal = function() {
    var m = document.getElementById('modal-crm-profile');
    if(m) m.style.display = 'none';
};

// 1. FILTRE FIREBASE : Supprime instantanément les caractères interdits
window.sanitizeCRM = function(input) {
    input.value = input.value.replace(/[.#$\[\]\/]/g, '');
};

// 🚀 NOUVEAU : Efface les caractères interdits ET prévient le joueur (Ergonomie)
window.sanitizePseudoLive = function(input, warningId) {
    let val = input.value;
    let cleanVal = val.replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, '');
    let warningEl = document.getElementById(warningId);

    if (val !== cleanVal) {
        input.value = cleanVal; // Effacement physique
        if (warningEl) {
            warningEl.style.display = 'block'; // Affichage du message
            clearTimeout(warningEl.timeout);
            // Disparition automatique après 3.5 secondes
            warningEl.timeout = setTimeout(() => { warningEl.style.display = 'none'; }, 3500);
        }
    } else {
        input.value = cleanVal;
    }
};

// 2. API CODE POSTAL : Remplit la ville automatiquement
window.fetchCity = function(input) {
    input.value = input.value.replace(/[^0-9]/g, ''); // Forcer uniquement des chiffres
    if(input.value.length === 5) {
        fetch('https://geo.api.gouv.fr/communes?codePostal=' + input.value)
        .then(res => res.json())
        .then(data => {
            if(data && data.length > 0) {
                // Remplir le champ ville avec le premier résultat
                document.getElementById('crm-city').value = data[0].nom;
            }
        }).catch(e => console.log(e));
    }
};

window.showCRMError = function(msg) {
    document.getElementById('crm-error').innerText = msg;
};

window.updateCRM = function() {
    window.showCRMError(""); // Effacer les erreurs à chaque changement
    for(var i=1; i<=3; i++) {
        var p = document.getElementById('crm-part-' + i);
        if(p) p.style.display = (i === window.crmStep) ? 'block' : 'none';

        var d = document.getElementById('s-dot-' + i);
        var l = document.getElementById('s-line-' + i);

        if(d) {
            if(i < window.crmStep) d.className = 'crm-step completed';
            else if(i === window.crmStep) d.className = 'crm-step active';
            else d.className = 'crm-step';
        }
        if(l) {
            if(i < window.crmStep) l.className = 'crm-step-line active';
            else l.className = 'crm-step-line';
        }
    }

    var bb = document.getElementById('btn-c-back');
    var bn = document.getElementById('btn-c-next');
    
    if(bn) {
        bn.style.background = 'var(--primary)';
        if(window.crmStep === 1) {
            if(bb) bb.style.display = 'none';
            bn.style.width = '100%'; bn.innerText = 'Étape Suivante';
        } else if(window.crmStep === 2) {
            if(bb) bb.style.display = 'block';
            bn.style.width = '60%'; bn.innerText = 'Étape Suivante';
        } else if(window.crmStep === 3) {
            if(bb) bb.style.display = 'block';
            bn.style.width = '60%'; bn.style.background = '#27ae60';
            
            if(window.isGoogleAuthMode) {
                document.getElementById('crm-google-avatar-zone').style.display = 'block';
                document.getElementById('crm-classic-avatar-zone').style.display = 'none';
                bn.innerText = 'Finaliser !';
            } else {
                document.getElementById('crm-google-avatar-zone').style.display = 'none';
                document.getElementById('crm-classic-avatar-zone').style.display = 'block';
                bn.innerText = 'Créer mon Compte !';
            }
        }
    }
};

window.crmNext = function() {
    // 🚀 PROTECTION ANTI-SPAM : On ignore la touche "Entrée" et les clics multiples si ça charge déjà
    var btnNext = document.getElementById('btn-c-next');
    if (btnNext && btnNext.disabled) return;

    window.showCRMError(""); // Reset erreur

    // --- VÉRIFICATIONS ÉTAPE 1 (Identifiants) ---
    if(window.crmStep === 1) {
        var m1 = document.getElementById('crm-email').value;
        var m2 = document.getElementById('crm-email-conf').value;
        var pwd = document.getElementById('crm-pwd').value;
        var pwdConf = document.getElementById('crm-pwd-conf').value;
        
        if(!m1 || !m2 || !pwd || !pwdConf) { window.showCRMError("Veuillez remplir tous les champs."); return; }
        if(!m1.includes('@')) { window.showCRMError("Format d'e-mail invalide."); return; }
        if(m1 !== m2) { window.showCRMError("Les adresses e-mail ne correspondent pas."); return; }
        if(pwd !== pwdConf) { window.showCRMError("Les mots de passe ne correspondent pas."); return; }
        
        // Vérification du mot de passe (8 car, 1 maj, 1 min, 1 chiffre, 1 spécial)
        var pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        if(!pwdRegex.test(pwd)) { 
            window.showCRMError("Mot de passe trop faible (min 8 car, 1 Maj, 1 min, 1 chiffre, 1 spécial)."); 
            return; 
        }
    }

    // --- VÉRIFICATIONS ÉTAPE 2 (Infos) ---
    // --- VÉRIFICATIONS ÉTAPE 2 (Infos) ---
    if(window.crmStep === 2) {
        var prenom = document.getElementById('crm-firstname').value;
        var nom = document.getElementById('crm-lastname').value;
        var tel = document.getElementById('crm-phone').value;
        var dob = document.getElementById('crm-dob').value;
        var zip = document.getElementById('crm-zip').value;
        var ville = document.getElementById('crm-city').value;
        
        if(!prenom || !nom || !dob || !zip || !ville) { 
            window.showCRMError("Veuillez remplir les champs obligatoires (*)."); 
            return; 
        }
        
        // 🚀 Vérification stricte de la date format JJ/MM/AAAA
        if(!window.isValidDate(dob)) {
            window.showCRMError("La date de naissance doit être au format valide JJ/MM/AAAA.");
            return;
        }
    }

    // --- VÉRIFICATIONS ÉTAPE 3 (Pseudo) ---
    if(window.crmStep === 3) {
        var checkPseudo = document.getElementById('crm-pseudo').value.trim();
        if(checkPseudo.length < 2) {
            window.showCRMError("Veuillez choisir un pseudo (min. 2 caractères).");
            return;
        }
        const regex = /^[a-zA-Z0-9À-ÿ\s\-_]+$/;
        if (!regex.test(checkPseudo)) {
            window.showCRMError("Caractères autorisés : Lettres, Chiffres, Espaces, Tirets (-), Underscore (_).");
            return;
        }
    }

    // Si tout est bon, on passe à l'étape suivante ou on ENVOIE À FIREBASE
    if(window.crmStep < 3) { 
        window.crmStep++; 
        window.updateCRM(); 
    } else { 
        // PHASE 3 : CRÉATION DU COMPTE FIREBASE
        var btnNext = document.getElementById('btn-c-next');
        var originalText = btnNext.innerText;
        btnNext.innerText = "Création en cours... ⏳";
        btnNext.disabled = true;

        var email = document.getElementById('crm-email').value;
        var prenom = document.getElementById('crm-firstname').value;
        var nom = document.getElementById('crm-lastname').value;
        var tel = document.getElementById('crm-phone').value;
        var dob = document.getElementById('crm-dob').value;
        var zip = document.getElementById('crm-zip').value;
        var ville = document.getElementById('crm-city').value;
        var pseudo = document.getElementById('crm-pseudo').value;
        var company = document.getElementById('crm-company').value;

        // Fonction universelle d'écriture dans la base
        var saveToDatabase = function(userUID, userEmail, isGoogle) {
            // 🚀 SÉCURITÉ ABSOLUE : On crée l'historique dès la seconde 0
            var initialHistory = window.googleAvatar ? [{ url: window.googleAvatar, isPermanent: true }] : [];
            window.avatarHistory = initialHistory;

            return firebase.database().ref('users_crm/' + userUID).set({
                email: userEmail,
                firstName: prenom,
                lastName: nom,
                phone: tel,
                dob: dob,
                zip: zip,
                city: ville,
                pseudo: pseudo,
                company: company,
                avatar: window.googleAvatar || "", 
                avatarHistory: initialHistory, // 🚀 Injection immédiate
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                stats: { gamesPlayed: 0, totalPoints: 0, fastestBuzz: 9999, teamsJoined: 0 }
            }).then(function() {
                var finalPseudo = document.getElementById('crm-pseudo').value;
                if (isGoogle) alert("🎉 Inscription Google terminée avec succès !");
                else alert("🎉 Bienvenue ! Un e-mail de confirmation vous a été envoyé (Vérifiez vos SPAMS !).");
                
                window.closeCRMModal();
                
                // FIX CAPITAINE & PHOTO
                player.id = userUID; 
                myUserID = userUID; // LE FAMEUX BADGE !
                localStorage.setItem('buzz_userId', myUserID);
                player.pseudo = finalPseudo;
                window.crmPseudo = player.pseudo; // 🚀 Mémorisation
                if (window.googleAvatar) player.avatar = window.googleAvatar;
                window.crmAvatar = player.avatar; // 🚀 Mémorisation Avatar
				
                var gamePseudoInput = document.getElementById('input-pseudo');
                if (gamePseudoInput) gamePseudoInput.value = finalPseudo;
                
                // 🚀 REDIRECTION VERS LE VIDEUR ANTI-CLONES
                navigateTo('step-pseudo');
                btnNext.innerText = originalText; btnNext.disabled = false;
            });
        };

        // BIFURCATION : GOOGLE ou CLASSIQUE ?
        if (window.isGoogleAuthMode && window.googleUser) {
            // MODE GOOGLE : Le coffre-fort Auth existe déjà, on écrit juste dans la Database
            saveToDatabase(window.googleUser.uid, window.googleUser.email, true).catch(function(error) {
                console.error("Erreur Firebase :", error);
                window.showCRMError("Erreur d'écriture dans la base de données.");
                btnNext.innerText = originalText; btnNext.disabled = false;
            });
        } else {
            // MODE CLASSIQUE : On crée d'abord le coffre-fort (Mot de passe)
            var pwd = document.getElementById('crm-pwd').value;
            firebase.auth().createUserWithEmailAndPassword(email, pwd)
            .then(function(userCredential) {
                var user = userCredential.user;
                user.sendEmailVerification(); // Envoi du mail
                return saveToDatabase(user.uid, email, false);
            })
            .catch(function(error) {
                console.error("Erreur Firebase :", error);
                var msg = "Erreur lors de la création du compte.";
                if(error.code === 'auth/email-already-in-use') msg = "Cette adresse e-mail possède déjà un compte !";
                else if(error.code === 'auth/network-request-failed') msg = "Erreur réseau. Vérifiez votre connexion internet.";
                window.showCRMError(msg);
                
                btnNext.innerText = originalText; btnNext.disabled = false;
            });
        }
    }
};

window.crmPrev = function() {
    if(window.crmStep > 1) { window.crmStep--; window.updateCRM(); }
};

window.crmCheckEnter = function(e) {
    if(e && e.key === 'Enter') window.crmNext();
};

// ==========================================
// MOTEUR DE CONNEXION (LOGIN & SÉCURITÉ)
// ==========================================
window.openLoginModal = function() {
    var m = document.getElementById('modal-crm-login');
    if(m) { m.style.display = 'flex'; document.getElementById('login-error').innerText = ""; }
};

window.closeLoginModal = function() {
    var m = document.getElementById('modal-crm-login');
    if(m) m.style.display = 'none';
};

window.processLogin = function() {
    var btn = document.getElementById('btn-do-login');
    
    // 🚀 PROTECTION ANTI-SPAM : On ignore la touche "Entrée" si ça charge déjà
    if (btn && btn.disabled) return;

    var email = document.getElementById('login-email').value;
    var pwd = document.getElementById('login-pwd').value;
    var errDiv = document.getElementById('login-error');

    if(!email || !pwd) { errDiv.innerText = "Veuillez remplir tous les champs."; return; }
    
    btn.innerText = "Connexion... ⏳"; btn.disabled = true; errDiv.innerText = "";

    firebase.auth().signInWithEmailAndPassword(email, pwd)
    .then(function(userCredential) {
        var user = userCredential.user;
        
        // 🛑 LE BLOCAGE ANTI-RECONNEXION SI EMAIL NON VÉRIFIÉ
        if (!user.emailVerified) {
            if(confirm("⚠️ ACCÈS REFUSÉ ⚠️\n\nVous n'avez pas encore validé votre adresse e-mail.\n\nVeuillez cliquer sur le lien envoyé à " + email + " (Vérifiez vos SPAMS !).\n\nVoulez-vous que l'on vous renvoie un nouvel e-mail de validation ?")) {
                user.sendEmailVerification().then(() => {
                    alert("Nouvel e-mail envoyé à " + email + " !");
                }).catch(e => { alert("Erreur d'envoi : " + e.message); });
            }
            firebase.auth().signOut(); // On le déconnecte de force
            btn.innerText = "Se Connecter"; btn.disabled = false;
            return;
        }

        // ✅ CONNEXION RÉUSSIE : On récupère ses données pour jouer
        firebase.database().ref('users_crm/' + user.uid).once('value').then(function(snap) {
            if(snap.exists()) {
                var data = snap.val();
                
                // 🚀 NETTOYAGE : Suppression du profil invité inutile
                if(myUserID.startsWith('u_') && roomRef) roomRef.child('players/' + myUserID).remove();

                // --- 🚀 INITIALISATION DU JOUEUR (FIX CAPITAINE) ---
                player.id = user.uid;
                myUserID = user.uid; // LE FAMEUX BADGE !
                localStorage.setItem('buzz_userId', myUserID);
                
                player.pseudo = data.pseudo || data.firstName;
                window.crmPseudo = player.pseudo; // 🚀 Mémorisation
                if(data.avatar) player.avatar = data.avatar;
                window.crmAvatar = player.avatar; // 🚀 Mémorisation Avatar
				// 🚀 INITIALISATION GALERIE (Classique)
                if (data.avatarHistory) {
                    window.avatarHistory = data.avatarHistory;
                } else if (window.crmAvatar) {
                    window.avatarHistory = [{ url: window.crmAvatar, isPermanent: true }]; // Photo indélébile
                    firebase.database().ref('users_crm/' + user.uid).update({ avatarHistory: window.avatarHistory });
                } else {
                    window.avatarHistory = [];
                }
				
                alert("🎉 Bon retour parmi nous, " + player.pseudo + " !");
                window.closeLoginModal();
                
                // 🚀 ÉTAPE 2 : LIAISON DE RÉCUPÉRATION ET SESSION UNIQUE
                if (window.pendingRecoveryData) {
                    myUserID = window.pendingRecoveryData.uid;
                    localStorage.setItem('buzz_userId', myUserID);
                    
                    // 🚀 DÉCONNEXION DE L'AUTRE : On écrit notre jeton en base
                    firebase.database().ref('users_crm/' + myUserID).update({ currentSessionID: window.mySessionID });

                    player = { 
                        pseudo: window.pendingRecoveryData.name, 
                        avatar: window.pendingRecoveryData.avatar, 
                        team: window.pendingRecoveryData.teamName || "Solo", 
                        teamIcon: window.pendingRecoveryData.teamIcon || "" 
                    };
                    isCaptain = window.pendingRecoveryData.isCaptain || false;
                    window.pendingRecoveryData = null; // On vide la mémoire
                    showReconnectScreen(); // On va direct à l'écran final
                } else {
                    // 🚀 VOIE VIP (Connexion classique) : On vérifie si le joueur est déjà dans la salle
                    firebase.database().ref('users_crm/' + user.uid).update({ currentSessionID: window.mySessionID });
                    if (typeof roomRef !== 'undefined' && roomRef) {
                        roomRef.child('players/' + user.uid).once('value').then(roomSnap => {
                            if (roomSnap.exists()) {
                                showReconnectScreen(); // Joueur déjà dans la salle : direct à l'écran de retour !
                            } else {
                                document.getElementById('input-pseudo').value = player.pseudo;
                                navigateTo('step-pseudo'); 
                            }
                        });
                    } else {
                        document.getElementById('input-pseudo').value = player.pseudo;
                        navigateTo('step-pseudo'); 
                    }
                }
            } else {
                errDiv.innerText = "Profil introuvable.";
            }
            btn.innerText = "Se Connecter"; btn.disabled = false;
        });
    })
    .catch(function(error) {
        console.error(error);
        btn.innerText = "Se Connecter"; btn.disabled = false;
        
        // 🚀 NOUVEAU : Interception intelligente du compte inexistant
        if(error.code === 'auth/user-not-found') {
            errDiv.innerText = "";
            document.getElementById('login-smart-error').style.display = 'block';
        } else if(error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errDiv.innerText = "E-mail ou mot de passe incorrect.";
            document.getElementById('login-smart-error').style.display = 'none';
        } else if(error.code === 'auth/too-many-requests') {
            errDiv.innerText = "Trop de tentatives. Réessayez plus tard.";
        } else {
            errDiv.innerText = "Erreur de connexion.";
        }
    });
};

window.resetPassword = function() {
    var email = document.getElementById('login-email').value;
    if(!email || !email.includes('@')) { document.getElementById('login-error').innerText = "Entrez votre e-mail au-dessus d'abord."; return; }
    firebase.auth().sendPasswordResetEmail(email).then(function() {
        alert("Un lien pour réinitialiser votre mot de passe a été envoyé à " + email + " (Vérifiez vos spams !).");
    }).catch(function(error) { document.getElementById('login-error').innerText = "Erreur : " + error.message; });
};

// --- PATCH V1.231 : GESTION DU CHOIX PSEUDO ---
window.handlePseudoChoice = function(saveToCrm) {
    const val = document.getElementById('input-pseudo').value.trim();
    
    const finalizeFlow = () => {
        if (isEditing) {
            if (roomRef) roomRef.child('players/' + myUserID).update({ name: val }); 
            player.pseudo = val; 
            finishEdit(true);
        } else {
            finalizePseudoValidation(val);
        }
    };

    if (saveToCrm && myUserID && !myUserID.startsWith('u_')) {
        firebase.database().ref('users_crm/' + myUserID).update({ pseudo: val }).then(() => {
            window.crmPseudo = val;
            finalizeFlow();
        });
    } else {
        finalizeFlow();
    }
};

// --- PATCH V1.232 : GESTION DU CHOIX AVATAR (Avec archivage automatique) ---
window.handleAvatarChoice = function(saveToCrm) {
    const finalizeAvatarFlow = () => {
        if (isEditing) {
            logEvent('SYSTEM', `✏️ ${player.pseudo} a changé son avatar`);
            if(roomRef) roomRef.child('players/' + myUserID).update({avatar: player.avatar}); 
            finishEdit(true);
        } else {
            window.handleModeRouting();
        }
    };

    if (saveToCrm && myUserID && !myUserID.startsWith('u_')) {
        
        // 🚀 ARCHIVAGE : L'ancien avatar est archivé AVANT d'être écrasé
        if (window.crmAvatar && window.crmAvatar !== player.avatar) {
            let alreadyExists = window.avatarHistory.find(a => a.url === window.crmAvatar);
            if (!alreadyExists) window.avatarHistory.unshift({ url: window.crmAvatar, isPermanent: false });
        }

        // Vérification de la galerie (max 10)
        if (window.avatarHistory && window.avatarHistory.length > 10 && !window.pendingSelfie) {
            window.pendingSelfie = player.avatar;
            alert("Galerie pleine ! Ton ancien avatar a pris la dernière place. Supprimez une photo pour enregistrer votre nouveau look.");
            window.openGalleryDirectly();
            return;
        }

        firebase.database().ref('users_crm/' + myUserID).update({ 
            avatar: player.avatar,
            avatarHistory: window.avatarHistory 
        }).then(() => {
            window.crmAvatar = player.avatar;
            finalizeAvatarFlow();
        });
    } else {
        // 🚀 NOUVEAU : Sauvegarde silencieuse des PHOTOS (Pas les emojis) dans l'historique pour "Cette partie"
        let isImage = player.avatar && (player.avatar.includes('http') || player.avatar.includes('data:image'));
        
        if (myUserID && !myUserID.startsWith('u_') && isImage) {
            let alreadyExists = window.avatarHistory.find(a => a.url === player.avatar);
            if (!alreadyExists) {
                // On vérifie la limite de la galerie (10 max)
                if (window.avatarHistory.length >= 10 && !window.pendingSelfie) {
                    window.pendingSelfie = player.avatar;
                    alert("Galerie pleine ! Ta photo pour cette partie est prête, mais supprime une ancienne photo pour la garder dans ton historique.");
                    window.openGalleryDirectly();
                    return;
                } else {
                    window.avatarHistory.unshift({ url: player.avatar, isPermanent: false });
                    firebase.database().ref('users_crm/' + myUserID).update({ 
                        avatarHistory: window.avatarHistory 
                    }).then(() => {
                        finalizeAvatarFlow();
                    });
                    return; // On attend le retour de Firebase avant de continuer
                }
            }
        }
        
        // Si c'est un invité ou un simple Emoji, on continue normalement
        finalizeAvatarFlow();
    }
};

// Exécuté automatiquement quand une place est libérée
window.savePendingSelfie = function() {
    if(!window.pendingSelfie) return;
    
    window.avatarHistory.unshift({ url: window.pendingSelfie, isPermanent: false });
    firebase.database().ref('users_crm/' + myUserID).update({ 
        avatar: window.pendingSelfie,
        avatarHistory: window.avatarHistory
    }).then(() => {
        window.crmAvatar = window.pendingSelfie;
        player.avatar = window.pendingSelfie;
        window.pendingSelfie = null; // On vide le buffer
        window.hideClassicAvatarMenu();
        
        if (isEditing) {
            logEvent('SYSTEM', `✏️ ${player.pseudo} a changé son avatar depuis la galerie`);
            if(roomRef) roomRef.child('players/' + myUserID).update({avatar: player.avatar}); 
            finishEdit(true);
        } else {
            window.handleModeRouting();
        }
    });
};

// --- PATCH V1.260 (ÉTAPE 1) : OUTILS D'AUTHENTIFICATION (CORRIGÉ) ---

// 1. Case à cocher : Afficher/Masquer les mots de passe
window.togglePasswordVisibility = function(checkbox, inputIds) {
    inputIds.forEach(id => {
        let input = document.getElementById(id);
        if(input) input.type = checkbox.checked ? "text" : "password";
    });
};

// 2. Validateur dynamique + Comparateur de mots de passe
window.checkPasswordMatch = function() {
    var p1 = document.getElementById('crm-pwd').value;
    var p2 = document.getElementById('crm-pwd-conf').value;
    var matchEl = document.getElementById('rule-match'); // 🚀 On cible maintenant l'élément de la liste
    
    // A. Analyse de la correspondance
    let isMatch = false;
    if(p1.length > 0 || p2.length > 0) {
        matchEl.style.display = 'block';
        if(p1 === p2 && p1.length > 0) {
            matchEl.innerHTML = "✅ Les mots de passe correspondent";
            matchEl.style.color = "var(--success)";
            isMatch = true;
        } else {
            matchEl.innerHTML = "❌ Les mots de passe ne correspondent pas";
            matchEl.style.color = "#e74c3c";
        }
    } else {
        matchEl.style.display = 'none';
    }

    // B. Analyse de la sécurité (Rouge/Vert)
    const rules = [
        { id: 'rule-len', test: p1.length >= 8, text: '8 caractères minimum' },
        { id: 'rule-maj', test: /[A-Z]/.test(p1), text: '1 Majuscule' },
        { id: 'rule-min', test: /[a-z]/.test(p1), text: '1 Minuscule' },
        { id: 'rule-num', test: /[0-9]/.test(p1), text: '1 Chiffre' },
        { id: 'rule-spe', test: /[^A-Za-z0-9]/.test(p1), text: '1 Caractère spécial' }
    ];
    
    let allValid = true;
    rules.forEach(r => {
        let el = document.getElementById(r.id);
        if (el) {
            if (r.test) {
                el.style.color = "var(--success)";
                el.innerHTML = "✅ " + r.text;
            } else {
                el.style.color = "#e74c3c";
                el.innerHTML = "❌ " + r.text;
                allValid = false;
            }
        }
    });
    
    let btnNext = document.getElementById('btn-c-next');
    if(btnNext && window.crmStep === 1) {
        btnNext.disabled = !(allValid && isMatch);
    }
    
    return (allValid && isMatch);
};

// 🚀 FORMATTEUR AUTOMATIQUE DE DATE (AJOUTE LES SLASHES / )
window.formatDateInput = function(input) {
    let v = input.value.replace(/\D/g, ''); // Garde que les chiffres
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length >= 5) {
        input.value = v.substring(0, 2) + '/' + v.substring(2, 4) + '/' + v.substring(4, 8);
    } else if (v.length >= 3) {
        input.value = v.substring(0, 2) + '/' + v.substring(2, 4);
    } else {
        input.value = v;
    }
};

window.isValidDate = function(dateString) {
    let regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(19|20)\d\d$/;
    return regex.test(dateString);
};

// 3. Le Pont Magique (Adapté)
window.switchToRegisterFromLogin = function() {
    let email = document.getElementById('login-email').value;
    let pwd = document.getElementById('login-pwd').value; 
    
    document.getElementById('modal-crm-login').style.display = 'none'; 
    window.openCRMModal(); 
    
    setTimeout(() => {
        document.getElementById('crm-email').value = email; 
        document.getElementById('crm-email-conf').value = email; 
        document.getElementById('crm-pwd').value = pwd;
        document.getElementById('crm-pwd-conf').value = pwd; 
        window.checkPasswordMatch(); // On lance la double vérification
    }, 100);
};

window.prepareSecureRecovery = function(uid, playerData) {
    // 🚀 Mémorisation des infos pour bloquer le retour à l'écran pseudo plus tard
    window.pendingRecoveryData = { uid: uid, name: playerData.name, avatar: playerData.avatar, teamName: playerData.teamName, teamIcon: playerData.teamIcon, isCaptain: playerData.isCaptain || false };
    
    // 1. On va chercher l'e-mail dans la base CRM (branche users_crm)
    firebase.database().ref('users_crm/' + uid).once('value').then(snap => {
        const crmData = snap.val() || {};
        const email = crmData.email || "Compte Google";
        
        // 2. Remplissage visuel de l'écran de confirmation
        document.getElementById('rec-pseudo-display').innerText = playerData.name;
        document.getElementById('rec-email-display').innerText = email;
        const avZone = document.getElementById('rec-avatar-display');
        if(playerData.avatar && playerData.avatar.length > 20) avZone.innerHTML = `<img src="${playerData.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
        else avZone.innerText = playerData.avatar || "👤";

        // 3. Pré-remplissage invisible du formulaire de login pour gagner du temps
        const loginEmailInput = document.getElementById('login-email');
        if(loginEmailInput && crmData.email) loginEmailInput.value = crmData.email;

        navigateTo('step-recovery-confirm');
    }).catch(error => {
        // 🚀 LE PARACHUTE : Si Firebase bloque l'accès (joueur non authentifié), on masque l'email mais on continue
        document.getElementById('rec-pseudo-display').innerText = playerData.name;
        document.getElementById('rec-email-display').innerText = "Compte protégé";
        const avZone = document.getElementById('rec-avatar-display');
        if(playerData.avatar && playerData.avatar.length > 20) avZone.innerHTML = `<img src="${playerData.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
        else avZone.innerText = playerData.avatar || "👤";

        navigateTo('step-recovery-confirm');
    });
};

window.openLoginWithEmail = function() {
    // Ouvre simplement la modale de connexion que tu as déjà
    window.openLoginModal();
};


window.confirmDeleteAccount = function() {
	const user = firebase.auth().currentUser;
	if (!user) return;

	// 🚀 La fonction de suppression réelle (qui attendra la validation du mot de passe)
	const runDeletion = () => {
		const confirm1 = confirm("⚠️ ACTION IRREVERSIBLE\n\nVoulez-vous vraiment supprimer votre compte et toutes vos statistiques ?");
		if(confirm1) {
			const confirm2 = confirm("🛑 DERNIÈRE VÉRIFICATION\n\nCela effacera vos points, vos victoires et vos photos de galerie. Confirmer la suppression ?");
			if(confirm2) {
				let targetUrl = "https://tapni.com/app/djcedrik";
				
				const finalizeCleanup = (url) => {
					alert("✅ Compte supprimé avec succès. Au revoir !");
					localStorage.clear();
					window.location.href = url;
				};

				const doFinalDelete = (url) => {
					db.ref('users_crm/' + myUserID).remove().then(() => {
						user.delete().then(() => {
							finalizeCleanup(url);
						}).catch(err => alert("❌ Erreur Firebase Auth : " + err.message));
					}).catch(err => alert("❌ Erreur Base de données : " + err.message));
				};

				// 🚀 CORRECTION : On attend la réponse de Firebase avant de détruire le compte
				if (typeof roomRef !== 'undefined' && roomRef) {
					roomRef.child('players/' + myUserID).remove().catch(()=>{});
					roomRef.child('mjLink').once('value').then(snap => { 
						const linkVal = snap.val();
						doFinalDelete((linkVal && linkVal.startsWith('http')) ? linkVal : targetUrl); 
					}).catch(() => { 
						doFinalDelete(targetUrl); 
					});
				} else {
					doFinalDelete(targetUrl);
				}
			}
		}
	};

	// 🚀 Aiguillage selon le type de compte (Email ou Google)
	const provider = user.providerData[0]?.providerId;

	if (provider === 'password') {
		// C'est un compte Email : On affiche ta modale
		actionAfterReauth = runDeletion;
		document.getElementById('reauth-password').value = "";
		document.getElementById('modal-reauth').style.display = 'flex';
	} else if (provider === 'google.com') {
		// C'est un compte Google : On demande une vérification rapide via popup
		const googleProvider = new firebase.auth.GoogleAuthProvider();
		user.reauthenticateWithPopup(googleProvider)
		.then(() => runDeletion())
		.catch(() => alert("❌ Authentification annulée."));
	} else {
		runDeletion();
	}
};

// 🚀 La fonction qui vérifie le mot de passe tapé dans la modale
window.processReauth = function() {
	const user = firebase.auth().currentUser;
	const pwd = document.getElementById('reauth-password').value;
    
	if(!pwd) { 
		alert("Veuillez saisir votre mot de passe."); 
		return; 
	}

	// Création du badge d'identité Firebase
	const credential = firebase.auth.EmailAuthProvider.credential(user.email, pwd);

	// Vérification
	user.reauthenticateWithCredential(credential).then(() => {
		// ✅ C'est le bon mot de passe ! On cache la modale et on lance la suppression
		document.getElementById('modal-reauth').style.display = 'none';
		if(actionAfterReauth) actionAfterReauth();
	}).catch(error => {
	// ❌ Mauvais mot de passe
	alert("❌ Mot de passe incorrect. Merci de vous connecter avec le bon mot de passe.");
	document.getElementById('modal-reauth').style.display = 'none';
	// Comme tu l'as demandé, on rouvre le menu de profil
	openSettings();
	});
};

