/* ============================================================================
 * mj-core.js — Initialisation Firebase, Variables Globales, Auth, SuperAdmin & Hub
 * Console MJ Pro - Buz'Ta Puce (v1.302)
 * ============================================================================ */

// Version initialisée via config.js et synchronisée avec Firebase

const firebaseConfig = { apiKey: "AIzaSyAf1Vl_O8SHJeFjHavKBJgUFGGy73I8t-o", authDomain: "prestapuce-buzz.firebaseapp.com", databaseURL: "https://prestapuce-buzz-default-rtdb.europe-west1.firebasedatabase.app", projectId: "prestapuce-buzz", storageBucket: "prestapuce-buzz.firebasestorage.app", messagingSenderId: "907270883505", appId: "1:907270883505:web:197efec0b99db28180ba90" };
firebase.initializeApp(firebaseConfig);
const db = firebase.database(); const auth = firebase.auth(); const storage = firebase.storage();
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary"); const secondaryAuth = secondaryApp.auth();

const avatars = ["🦁","🐯","🐼","🦊","🐵","🐶","🐱","🦄","😎","🤖","👽","👾","👻","🤡","🐙","🦉","🐸","🐹","🐰","🥳","🤠","😈","🎅","🧙","🧛","🧜","🧝","🧞","🧟","🧚","👼","🤵","🤴","👸","🕵","👮","👩‍🚒","👩‍🚀","🦸","🦹"];

// 🚀 OUTILS GLOBAUX : FILTRE BDD & CONFIRMATION INTERNE NON-BLOQUANTE
window.sanitizeMjInput = function(input) {
    if (input) input.value = input.value.replace(/[.#$\[\]\/]/g, '');
};

window.mjConfirm = function(title, message, onConfirm, okLabel = "Confirmer", okColor = "var(--danger)") {
    const modal = document.getElementById('modal-mj-confirm');
    document.getElementById('mjc-title').innerText = title;
    document.getElementById('mjc-msg').innerText = message;
    const okBtn = document.getElementById('mjc-ok');
    okBtn.innerText = okLabel;
    okBtn.style.background = okColor;
    okBtn.onclick = () => { modal.style.display = 'none'; onConfirm(); };
    document.getElementById('mjc-cancel').onclick = () => { modal.style.display = 'none'; };
    modal.style.display = 'flex';
};

// 🚀 ==========================================
// MOTEUR DE SIMULATION "BAC À SABLE" INTERACTIF V3 (v1.300)

// --- ÉTAT GLOBAL DU SIMULATEUR & TUTORIEL (partagé avec mj-tuto.js) ---
window.isTutoRunning = false;  // Guidage pas-à-pas (écran assombri)
window.isSandboxMode = false;  // Isolation locale des 5 faux téléphones
let tutoCurrentPhase = 0;
let tutoCurrentStep = 0;
let tutoHighestStep = { 0: 0, 1: 0, 2: 0 };
let tutoListener = null;
let tutoAdvanceTimer = null;
let savedRealRoomState = null;
let lastSimuBuzzerUid = "t2";

let roomID = "", roomRef = null, currentPlayer = null, selCrest = "", globalTeams = {};
let allPlayersData = {}, currentBlocked = {}, editingTeamKey = null, mjProfileData = {};

let activeLibraryUid = null, isProxyMode = false, activeBgLibraryUid = null, isProxyBgMode = false, modalSelectedBgUrl = "";
let mjLibrary = {}, mjBgLibrary = {}, currentRoomBgUrl = "";
let showDefaultCrests = true, pendingRestoreTeam = null, currentBuzzerId = null, buzzHistory = [];
let editingPlayerUid = null, editingPlayerOriginalPseudo = "", editingPlayerOriginalAvatar = "", editingPlayerCurrentAvatar = "";
let isSuperAdmin = false, allUsersData = {}, targetMjUid = null;
// --- PATCH V1.197 : VARIABLES DE TRI ---
let playerSort = { col: 'default', asc: true };
let teamSort = { col: 'default', asc: true };
let memberSort = { col: 'default', asc: true };

let buzzProcessing = false;
let currentGameState = 'waiting';
let curLbType = '', curLbIdx = 0, lbCrests = [], lbBgsModal = [];
let currentPlayerFilter = 'all';
let currentMjTeamFilter = 'all'; 

let mjRooms = [];
let currentHubTab = 'active';

let holdTimer = null;
let isRenderingTeamLobby = false;
let currentOpenTeam = null;
let activeTeamBlacklist = [];
let activeTeamBlacklistListener = null;
let activeDropdownBtn = null;

// PATCH V1.232 : Moteur du Mouchard (Audit Log)
function logEvent(actionType, message) {
    // Sécurité : On n'enregistre que si une salle est active
    if (!roomID) return; 
    
    firebase.database().ref('rooms/' + roomID + '/debugLog').push({
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: actionType, 
        msg: message
    });
}

// PATCH V1.232 : Téléchargement du fichier d'historique
function downloadAuditLog(targetRoomId, e) {
    if (e) e.stopPropagation(); // 🟢 Empêche l'accordéon de bouger
    firebase.database().ref('rooms/' + targetRoomId + '/debugLog').once('value', snap => {
        if (!snap.exists()) {
            return alert("Aucun historique disponible pour cette salle.");
        }
        
        let logText = "=========================================================\r\n";
        logText += "HISTORIQUE DE DEBUG - SALLE : " + targetRoomId + "\r\n";
        logText += "=========================================================\r\n\r\n";
        
        snap.forEach(child => {
            const l = child.val();
            const d = new Date(l.timestamp);
            const time = d.toLocaleString('fr-FR'); 
            logText += `[${time}] ${l.type} : ${l.msg}\r\n`;
        });
        
        const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Audit_Salle_${targetRoomId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function isValidPassword(pwd) { return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pwd); }

// 🚀 MOTEUR DE VÉRIFICATION VISUELLE DU MOT DE PASSE (Unifié)
window.checkMjPasswordMatch = function(idPass1, idPass2, idMatch, idLen, idMaj, idMin, idNum, idSpe, idList, idBtn) {
    var p1 = document.getElementById(idPass1).value;
    var p2 = document.getElementById(idPass2).value;
    var rulesZone = document.getElementById(idList);
    var btnSave = document.getElementById(idBtn);
    var matchEl = idMatch ? document.getElementById(idMatch) : null;
    
    if(p1.length > 0 || (idPass1 !== idPass2 && p2.length > 0)) {
        rulesZone.style.display = 'block';
    } else { 
        rulesZone.style.display = 'none'; 
        if(btnSave) btnSave.disabled = false; // On débloque si le MJ a effacé le champ pour annuler la modif
        return; 
    }

    let isMatch = true;
    if (matchEl) {
        matchEl.style.display = 'block';
        if(p1 === p2 && p1.length > 0) {
            matchEl.innerHTML = "✅ Les mots de passe correspondent";
            matchEl.style.color = "var(--success)";
            isMatch = true;
        } else {
            matchEl.innerHTML = "❌ Les mots de passe ne correspondent pas";
            matchEl.style.color = "#e74c3c";
            isMatch = false;
        }
    }

    const rules = [
        { id: idLen, test: p1.length >= 8, text: '8 caractères minimum' },
        { id: idMaj, test: /[A-Z]/.test(p1), text: '1 Majuscule' },
        { id: idMin, test: /[a-z]/.test(p1), text: '1 Minuscule' },
        { id: idNum, test: /[0-9]/.test(p1), text: '1 Chiffre' },
        { id: idSpe, test: /[^A-Za-z0-9]/.test(p1), text: '1 Caractère spécial' }
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
    
    if(btnSave) {
        btnSave.disabled = !(allValid && isMatch);
    }
};

window.onload = function() {
    
    /* --- PATCH V1.218 : CHARGEMENT DE L'EMAIL --- */
    const savedEmail = localStorage.getItem('presta_mj_email');
    if(savedEmail) {
        document.getElementById('mj-email').value = savedEmail;
        document.getElementById('remember-me').checked = true;
    }            
    initVersionListener();
    
    setupGridDragDrop('lib-grid', f => handleFiles(f));
    setupGridDragDrop('bg-modal-gallery', f => handleBgUpload(f, 'modal'));
    setupGridDragDrop('profile-drop-zone', f => handleProfileFile(f));
    
    const crestGrid = document.getElementById('modal-crest-grid');
    if (crestGrid) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(n => crestGrid.addEventListener(n, e=>{e.preventDefault();e.stopPropagation();}, false));
        ['dragenter', 'dragover'].forEach(n => crestGrid.addEventListener(n, ()=>crestGrid.classList.add('drag-active'), false));
        ['dragleave', 'drop'].forEach(n => crestGrid.addEventListener(n, ()=>crestGrid.classList.remove('drag-active'), false));
        crestGrid.addEventListener('drop', e => handleTeamModalUpload(e.dataTransfer.files), false);
    }
    
    document.addEventListener('keydown', e => { if(document.getElementById('univ-lightbox').style.display === 'flex') { if(e.key==='ArrowLeft') lbPrev(e); else if(e.key==='ArrowRight') lbNext(e); else if(e.key==='Escape') closeLightbox(e); } });
    
    window.addEventListener('scroll', handleGhostUI, true);
    document.querySelectorAll('button:not([title])').forEach(b => {
        const txt = b.innerText.replace(/\s+/g, ' ').trim();
        if (txt) b.setAttribute('title', txt);
    });
};

function setupGridDragDrop(id, handler) { 
    const el = document.getElementById(id); 
    if(el) { 
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(n => { el.addEventListener(n, e=>{e.preventDefault();e.stopPropagation();}, false); }); 
        ['dragenter', 'dragover'].forEach(n => el.addEventListener(n, ()=>el.classList.add('drag-active'), false)); 
        ['dragleave', 'drop'].forEach(n => el.addEventListener(n, ()=>el.classList.remove('drag-active'), false)); 
        el.addEventListener('drop', e => { handler(e.dataTransfer.files); el.classList.remove('drag-active'); }, false); 
    } 
}

function handleGhostUI(e) {
    if (e.target.classList && e.target.classList.contains('scroll-list')) closeGlobalDropdown();
    
    const tools = document.getElementById('top-right-tools');
    const logo = document.getElementById('global-mj-logo-container');
    
    if (window.scrollY > 20) {
        if(tools) tools.classList.add('faded');
        if(logo) logo.classList.add('faded');
    } else {
        if(tools) tools.classList.remove('faded');
        if(logo) logo.classList.remove('faded');
    }
}

// --- PATCH V1.197 : LOGIQUE DE TRI ---
function setSort(type, col) {
    let sortObj = (type === 'player') ? playerSort : (type === 'team') ? teamSort : memberSort;
    if (sortObj.col === col) { sortObj.asc = !sortObj.asc; } else { sortObj.col = col; sortObj.asc = true; }
    if (type === 'player') renderLobby(); else if (type === 'team') renderTeamLobby(); else renderTeamMembers(currentOpenTeam);
}

function getSortArrow(type, col) {
    let sortObj = (type === 'player') ? playerSort : (type === 'team') ? teamSort : memberSort;
    if (sortObj.col !== col) return "↕️";
    return sortObj.asc ? "🔼" : "🔽";
}

/* --- PATCH V1.268 : CORRECTION SAFARI NAVIGATION PRIVÉE (FALLBACK INDEXEDDB) --- */
function login() { 
    const e = document.getElementById('mj-email').value.trim();
    const p = document.getElementById('mj-pass').value; 
    
    if(!e || !p) return alert("Veuillez saisir votre email et votre mot de passe.");
    
    /* --- PATCH V1.218 : SAUVEGARDE DE L'EMAIL --- */
    if(document.getElementById('remember-me').checked) {
        localStorage.setItem('presta_mj_email', e);
    } else {
        localStorage.removeItem('presta_mj_email');
    }
    
    document.getElementById('btn-login-submit').innerText = "⏳ Connexion...";
    
    let persistenceMode = document.getElementById('remember-me').checked 
        ? firebase.auth.Auth.Persistence.LOCAL 
        : firebase.auth.Auth.Persistence.SESSION;

    auth.setPersistence(persistenceMode)
    .then(() => {
        return auth.signInWithEmailAndPassword(e, p);
    })
    .then(r => {
        loadMjData(r.user);
    })
    .catch(err => {
        if (err.message && err.message.includes("destructured")) {
            auth.setPersistence(firebase.auth.Auth.Persistence.NONE)
            .then(() => auth.signInWithEmailAndPassword(e, p))
            .then(r => loadMjData(r.user))
            .catch(fallbackErr => {
                document.getElementById('btn-login-submit').innerText = "Se Connecter";
                alert("Oups ! Identifiants incorrects ou erreur : " + fallbackErr.message);
            });
        } else {
            document.getElementById('btn-login-submit').innerText = "Se Connecter";
            alert("Oups ! Identifiants incorrects ou erreur : " + err.message);
        }
    }); 
}

function forgotPassword() { 
    const e=document.getElementById('mj-email').value.trim(); 
    if(e) {
        auth.sendPasswordResetEmail(e).then(()=>alert("Email de réinitialisation envoyé !")).catch(err=>alert("Erreur: "+err.message)); 
    } else {
        alert("Veuillez saisir votre adresse email d'abord.");
    }
}

function togglePasswordVisibility(id, icon) { const i=document.getElementById(id); if(i.type==='password'){ i.type='text'; icon.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 3.31 0 6.28-1.38 8.22-3.67l.48.48 2.73 2.73 1.27-1.27L3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>'; } else { i.type='password'; icon.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'; } }

// --- PATCH V1.194 : FONCTIONS PROFIL & SYNCHRO ---
function toggleProfile() { const p = document.getElementById('screen-profile'); if(p.style.display==="block") closeProfile(); else showProfile(); }

function profileLogout() { auth.signOut().then(()=>location.reload()); }

function syncLibraryToRoom() { try { if(roomID && roomRef) roomRef.child('library').set(mjLibrary || {}); } catch(e){ console.error("Erreur sync library", e); } }
function initLibrarySync() { roomRef.child('library').on('value', snap => { const r = snap.val()||{}; const u = auth.currentUser.uid; if(!u)return; let h=false; Object.values(r).forEach(url => { if(!Object.values(mjLibrary).includes(url)){ db.ref(`users/${u}/library`).push(url); h=true; } }); if(h) { loadModalLibrary(); if(document.getElementById('modal-team-edit').style.display === 'flex') loadModalCrestGrid(); } }); }
// ----------------------------------------------

function loadMjData(user) {
    isSuperAdmin = (user.email === 'contact@prestapuce.com'); 
    activeLibraryUid = user.uid; 
    activeBgLibraryUid = user.uid;
    
    if(isSuperAdmin) { 
        document.getElementById('btn-super-admin').style.display='inline-block'; 
        ['index', 'mj', 'remote', 'scores', 'guide'].forEach(f => {
            const disp = document.getElementById('disp-v-' + f);
            const inp = document.getElementById('inp-v-' + f);
            if(disp) disp.style.display = 'none';
            if(inp) inp.style.display = 'inline-block';
        });
        document.getElementById('sa-inline-save-btn').style.display='block';
        initSuperAdminListener(); 
    } else { 
        document.getElementById('btn-super-admin').style.display='none'; 
        ['index', 'mj', 'remote', 'scores', 'guide'].forEach(f => {
            const disp = document.getElementById('disp-v-' + f);
            const inp = document.getElementById('inp-v-' + f);
            if(disp) disp.style.display = 'inline-block';
            if(inp) inp.style.display = 'none';
        });
        document.getElementById('sa-inline-save-btn').style.display='none';
    }
    
    db.ref('users/' + user.uid).update({ email: user.email }).catch(e => console.warn(e));
    
    db.ref('users/' + user.uid).once('value').then(snap => {
        const data = snap.val() || {};
        if(!isSuperAdmin && data.isGuest !== true) { 
            if(data.isBlocked || (data.expirationDate && data.expirationDate < Date.now())) { 
                alert("⚠️ ACCÈS REFUSÉ. Abonnement expiré ou bloqué."); 
                return auth.signOut().then(()=>location.reload()); 
            } 
        }
        mjProfileData = data;
        if (!data.library && data.customLogos) { let m={}; Object.values(data.customLogos).forEach((u,i)=>m['m_'+i]=u); db.ref(`users/${user.uid}/library`).set(m).then(()=>{ mjLibrary=m; }); } else { mjLibrary = data.library || {}; }
        mjBgLibrary = data.bgLibrary || {};
        
        if(data.consoleBackground) applyMjConsoleBg(data.consoleBackground); else applyMjConsoleBg(null);
        
        showDefaultCrests = (data.showDefaultCrests !== false); 
        if(document.getElementById('check-hide-default')) document.getElementById('check-hide-default').checked = showDefaultCrests;
        
        document.getElementById('btn-login-submit').innerText = "Se Connecter";
        
        if(mjProfileData.isGuest === true) { 
            db.ref().update({[`users/${user.uid}/lastRoom`]:null, [`users/${user.uid}/library`]:null}).then(()=>{ mjProfileData.lastRoom=""; mjLibrary={}; document.getElementById('mj-display-name').innerText=mjProfileData.prenom||"MJ"; updateLogos(mjProfileData.customLogo); checkUserRoom(user.uid); }); 
        } else { 
            document.getElementById('mj-display-name').innerText=data.prenom||"MJ"; updateLogos(data.customLogo); checkUserRoom(user.uid); 
        }
    }).catch(e => {
        document.getElementById('btn-login-submit').innerText = "Se Connecter";
        console.error("ERREUR CRITIQUE FIREBASE :", e);
        alert("Erreur critique de la base de données. Détail : " + e.message);
    });
}

// --- SUPER ADMIN FUNCTIONS ---
function initSuperAdminListener() { if(isSuperAdmin) db.ref('users').on('value', snap => { allUsersData = snap.val() || {}; renderSAMjList(); }); }

function initVersionListener() { 
    db.ref('config/versions').on('value', snap => { 
        // Si Firebase est vide, on prend comme valeurs de secours celles de notre config.js centralisé
        const v = snap.val() || { 
            index: `v${APP_CONFIG.VERSIONS.CLIENT}`, 
            mj: `v${APP_VERSION}`, 
            remote: `v${APP_CONFIG.VERSIONS.REMOTE}`, 
            scores: `v${APP_CONFIG.VERSIONS.SCORES}`, 
            guide: `v${APP_CONFIG.VERSIONS.GUIDE}` 
        };
        
        if(document.getElementById('disp-v-index')) document.getElementById('disp-v-index').innerText = v.index;
        if(document.getElementById('disp-v-mj')) document.getElementById('disp-v-mj').innerText = `v${APP_VERSION}`;
        if(document.getElementById('disp-v-remote')) document.getElementById('disp-v-remote').innerText = v.remote;
        if(document.getElementById('disp-v-scores')) document.getElementById('disp-v-scores').innerText = v.scores;
        if(document.getElementById('disp-v-guide')) document.getElementById('disp-v-guide').innerText = v.guide;
        
        if(document.getElementById('inp-v-index') && document.activeElement.id !== 'inp-v-index') document.getElementById('inp-v-index').value = v.index;
        if(document.getElementById('inp-v-mj') && document.activeElement.id !== 'inp-v-mj') document.getElementById('inp-v-mj').value = `v${APP_VERSION}`;
        if(document.getElementById('inp-v-remote') && document.activeElement.id !== 'inp-v-remote') document.getElementById('inp-v-remote').value = v.remote;
        if(document.getElementById('inp-v-scores') && document.activeElement.id !== 'inp-v-scores') document.getElementById('inp-v-scores').value = v.scores;
        if(document.getElementById('inp-v-guide') && document.activeElement.id !== 'inp-v-guide') document.getElementById('inp-v-guide').value = v.guide;

        const appVersionDisp = document.getElementById('app-version-display');
        if (appVersionDisp) appVersionDisp.innerText = `v${APP_VERSION}`;
    }); 
}

function handleVersionKey(e, current, next) {
    if(e.key === 'Enter') {
        e.preventDefault();
        const newV = { index: document.getElementById('inp-v-index').value.trim(), mj: document.getElementById('inp-v-mj').value.trim(), remote: document.getElementById('inp-v-remote').value.trim(), scores: document.getElementById('inp-v-scores').value.trim(), guide: document.getElementById('inp-v-guide').value.trim() };
        db.ref('config/versions').set(newV);
        if(next) { document.getElementById('inp-v-' + next).focus(); } else { document.getElementById('inp-v-' + current).blur(); }
    }
}

function updateAllVersions() { 
    if(!isSuperAdmin) return;
    
    try {
        const newV = {};
        const fields = ['index', 'mj', 'remote', 'scores', 'guide'];
        
        fields.forEach(f => {
            const el = document.getElementById('inp-v-' + f);
            if (el) {
                newV[f] = el.value.trim();
            }
        });

        if(confirm("Forcer la mise à jour globale des versions ?")) { 
            db.ref('config/versions').set(newV)
            .then(() => alert("✅ Versions mises à jour avec succès !"))
            .catch(err => alert("❌ Erreur Firebase : " + err.message)); 
        }
    } catch (err) {
        console.error("Erreur lors de la mise à jour :", err);
        alert("⚠️ Erreur technique : " + err.message);
    }
}

function renderSAMjList() {
    const container = document.getElementById('sa-mj-list'); container.innerHTML = "";
    Object.keys(allUsersData).forEach(uid => {
        const u = allUsersData[uid]; const email = u.email || "Inconnu"; const name = (u.prenom || "MJ") + " " + (u.nom || "");
        let daysLeft = u.expirationDate ? Math.ceil((u.expirationDate - Date.now()) / 86400000) : 0; if (daysLeft < 0) daysLeft = 0;
        let statusColor = "var(--success)"; let statusText = daysLeft + " Jours";
        if(email === "contact@prestapuce.com" || daysLeft > 9000) { statusText = "NO LIMIT (SA)"; statusColor = "var(--gold)"; } 
        else if (u.isBlocked) { statusColor = "var(--danger)"; statusText = "BLOQUÉ"; } 
        else if (daysLeft <= 0) { statusColor = "#e67e22"; statusText = "EXPIRÉ"; }
        container.innerHTML += `<div class="score-row" style="cursor:pointer;" onclick="openVault('${uid}')"><div style="flex:1;"><b>${email}</b><br><small style="color:#bdc3c7;">${name}</small></div><div><span style="color:${statusColor}; font-weight:bold; background:rgba(0,0,0,0.5); padding:5px 10px; border-radius:5px; border:1px solid ${statusColor};">${statusText}</span></div></div>`;
    });
}
function openVault(uid) { targetMjUid = uid; document.getElementById('sa-vault-pass').value = ''; document.getElementById('modal-sa-vault').style.display = 'flex'; }
function verifyVaultPassword() { auth.signInWithEmailAndPassword(auth.currentUser.email, document.getElementById('sa-vault-pass').value).then(() => { document.getElementById('modal-sa-vault').style.display = 'none'; updateMjDetailsView(); document.getElementById('modal-sa-mj-details').style.display = 'flex'; }).catch(() => alert("Mot de passe incorrect !")); }
function updateMjDetailsView() {
    if(!targetMjUid || !allUsersData[targetMjUid]) return; const u = allUsersData[targetMjUid];
    document.getElementById('sa-det-prenom').value = u.prenom || ""; document.getElementById('sa-det-nom').value = u.nom || ""; document.getElementById('sa-det-email').value = u.email || "";
    let daysLeft = u.expirationDate ? Math.ceil((u.expirationDate - Date.now()) / 86400000) : 0; if(daysLeft < 0) daysLeft = 0;
    document.getElementById('sa-det-days-input').value = daysLeft;
    const btnBlock = document.getElementById('btn-sa-block');
    if(u.isBlocked) { btnBlock.innerText = "🟢 RÉACTIVER L'ACCÈS"; btnBlock.style.background = "var(--success)"; } else { btnBlock.innerText = "🔴 BLOQUER L'ACCÈS"; btnBlock.style.background = "var(--danger)"; }
    document.getElementById('sa-det-pass-current').value = ""; document.getElementById('sa-det-pass-new').value = ""; document.getElementById('sa-det-pass-conf').value = "";
}
function adjSaDays(val) { const i = document.getElementById('sa-det-days-input'); let f = (parseInt(i.value) || 0) + val; if(f < 0) f = 0; i.value = f; }
function setUnlimited() { document.getElementById('sa-det-days-input').value = 9999; }
function saveSAMjDetails() {
    const btnSave = document.getElementById('btn-sa-save');
    if (btnSave && btnSave.disabled) return; // 🚀 PROTECTION ANTI-BYPASS "ENTRÉE"
    
    if(!targetMjUid || !allUsersData[targetMjUid]) return; const u = allUsersData[targetMjUid]; const oldEmail = u.email || "";
    const updates = { prenom: document.getElementById('sa-det-prenom').value.trim(), nom: document.getElementById('sa-det-nom').value.trim(), expirationDate: Date.now() + ((parseInt(document.getElementById('sa-det-days-input').value) || 0) * 86400000) };
    const newEmail = document.getElementById('sa-det-email').value.trim(), currentPass = document.getElementById('sa-det-pass-current').value, newPass = document.getElementById('sa-det-pass-new').value, confPass = document.getElementById('sa-det-pass-conf').value;
    const emailChanged = (newEmail !== oldEmail && newEmail !== ""); const passChanged = (newPass !== "");
    if (emailChanged || passChanged) {
        if(!currentPass) return alert("Mot de passe ACTUEL requis.");
        if(passChanged) { if(newPass === currentPass) return alert("Le nouveau mdp doit être différent."); if(newPass !== confPass) return alert("Les mdps ne correspondent pas."); if(!isValidPassword(newPass)) return alert("Critères de sécurité non respectés."); }
        const btn = document.getElementById('btn-sa-save'); btn.innerText = "⏳ MISE À JOUR..."; btn.disabled = true;
        secondaryAuth.signInWithEmailAndPassword(oldEmail, currentPass).then(async (uc) => {
            try {
                if(emailChanged) await uc.user.updateEmail(newEmail); if(passChanged) await uc.user.updatePassword(newPass);
                updates.email = newEmail; await secondaryAuth.signOut();
                db.ref('users/' + targetMjUid).update(updates).then(() => { btn.innerText = "💾 ENREGISTRER"; btn.disabled = false; alert("Mis à jour !"); document.getElementById('modal-sa-mj-details').style.display = 'none'; });
            } catch(e) { await secondaryAuth.signOut(); btn.innerText = "💾 ENREGISTRER"; btn.disabled = false; alert("Erreur Auth : " + e.message); }
        }).catch(e => { btn.innerText = "💾 ENREGISTRER"; btn.disabled = false; alert("Erreur : " + e.message); });
    } else { db.ref('users/' + targetMjUid).update(updates).then(() => { alert("Enregistré !"); document.getElementById('modal-sa-mj-details').style.display = 'none'; }); }
}
function createMjAction() {
    const btnCreate = document.getElementById('btn-sa-create');
    if (btnCreate && btnCreate.disabled) return; // 🚀 PROTECTION ANTI-BYPASS "ENTRÉE"
    
    const email = document.getElementById('sa-create-email').value.trim(), pass = document.getElementById('sa-create-pass').value, prenom = document.getElementById('sa-create-prenom').value.trim();
    if(!email || !isValidPassword(pass)) return alert("Email invalide ou mdp non sécurisé.");
    secondaryAuth.createUserWithEmailAndPassword(email, pass).then((uc) => {
        db.ref('users/' + uc.user.uid).set({ email: email, prenom: prenom, expirationDate: Date.now() + (30 * 86400000), isBlocked: false }).then(() => {
            secondaryAuth.signOut(); document.getElementById('modal-sa-create').style.display = 'none';
            document.getElementById('sa-create-email').value = ''; document.getElementById('sa-create-pass').value = ''; document.getElementById('sa-create-prenom').value = '';
            window.location.href = `mailto:${email}?subject=Accès MJ Presta'Puce&body=Lien: https://prestapuce.github.io/prestapuce-blindtest/mj%0AEmail: ${email}%0AMdp: ${pass}`;
        });
    }).catch(e => alert("Erreur : " + e.message));
}
function deleteMjAccount() {
    if(!targetMjUid || !allUsersData[targetMjUid]) return; const email = allUsersData[targetMjUid].email;
    const pass = prompt(`⚠️ DANGER: Supprimer ${email} ?\nSaisir le mdp actuel pour supprimer l'Auth (ou vide pour juste BDD)`);
    if(pass !== null) {
        if(pass !== "") secondaryAuth.signInWithEmailAndPassword(email, pass).then((uc) => uc.user.delete().then(() => eraseMjDatabase(targetMjUid)).catch(e => { alert("Erreur Auth : " + e.message); eraseMjDatabase(targetMjUid); })).catch(e => { alert("Mdp incorrect."); eraseMjDatabase(targetMjUid); });
        else eraseMjDatabase(targetMjUid);
    }
}
function eraseMjDatabase(uid) { db.ref('users/' + uid).remove().then(() => { alert("Supprimé."); document.getElementById('modal-sa-mj-details').style.display = 'none'; }); }
function toggleBlockMj() { if(targetMjUid) db.ref('users/' + targetMjUid).update({ isBlocked: !allUsersData[targetMjUid].isBlocked }).then(() => setTimeout(updateMjDetailsView, 200)); }

function checkUserRoom(uid) {
    db.ref('rooms').orderByChild('mj').equalTo(uid).once('value', snap => {
        document.getElementById('screen-login').style.display="none"; 
        document.getElementById('screen-profile').style.display="none"; 
        document.getElementById('screen-dashboard').style.display="none"; 
        document.getElementById('screen-choice').style.display="block"; 
        document.getElementById('global-mj-logo-container').style.display="block";
        document.getElementById('top-right-tools').style.display="none"; 

        const rooms = snap.val() || {};
        mjRooms = Object.keys(rooms).map(k => ({ id: k, ...rooms[k] }));
        mjRooms.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        renderHubRooms();
        
        // 🚀 AFFICHE LA BOÎTE DE DIALOGUE "PROMPT" AU LIEU DE LANCER DIRECT
        setTimeout(() => { if(typeof window.showTutoPrompt === 'function') window.showTutoPrompt(); }, 500);
    }).catch(error => {
        console.error(error);
        alert("Erreur de connexion à la base de données : " + error.message);
    });
}

function setHubTab(tab) { currentHubTab = tab; renderHubRooms(); }

function getRoomStats(room) {
    const players = room.players || {};
    const pKeys = Object.keys(players);
    let count = pKeys.length;
    if (count === 0) return { count: 0, winner: "Aucun participant" };
    
    let teamScores = {};
    let isTeamGame = false;
    Object.values(players).forEach(p => {
        if(p.teamName && p.teamName !== "Solo") {
            isTeamGame = true;
            teamScores[p.teamName] = (teamScores[p.teamName] || 0) + (p.pts || 0);
        }
    });
    
    let winnerText = "";
    if (isTeamGame) {
        const sorted = Object.entries(teamScores).sort((a,b)=>b[1]-a[1]);
        winnerText = sorted.length > 0 ? sorted[0][0] + " (" + sorted[0][1] + " pts)" : "-";
    } else {
        const sorted = Object.values(players).sort((a,b)=>(b.pts||0)-(a.pts||0));
        winnerText = sorted.length > 0 ? sorted[0].name + " (" + (sorted[0].pts||0) + " pts)" : "-";
    }
    
    return { count, winner: winnerText };
}

function toggleAccordion(id) {
    const det = document.getElementById('details-' + id);
    const arr = document.getElementById('arrow-' + id);
    if (det.style.display === 'block') { det.style.display = 'none'; arr.classList.remove('open'); } 
    else { document.querySelectorAll('.hub-details').forEach(el => el.style.display = 'none'); document.querySelectorAll('.hub-arrow').forEach(el => el.classList.remove('open')); det.style.display = 'block'; arr.classList.add('open'); }
}

function deleteRoomFromHub(rID, e) {
    e.stopPropagation();
    if(confirm("⚠️ Êtes-vous sûr de vouloir supprimer définitivement la salle n°" + rID + " ? Cette action est irréversible.")) {
        backupAndDestroyRoom(rID).then(() => { mjRooms = mjRooms.filter(r => r.id !== rID); renderHubRooms(); });
    }
}

function backupAndDestroyRoom(targetRoomID) {
    return new Promise((resolve) => {
        const rRef = db.ref('rooms/' + targetRoomID);
        rRef.child('players').once('value').then(snap => {
            const players = snap.val() || {};
            const backupPromises = [];
            Object.keys(players).forEach(uid => {
                if (!uid.startsWith("u_")) { 
                    backupPromises.push(db.ref('users_crm/' + uid + '/history/' + targetRoomID).set({ date: firebase.database.ServerValue.TIMESTAMP, pts: players[uid].pts || 0, teamName: players[uid].teamName || "Solo", eventName: document.getElementById('display-event-name').innerText || "Partie" }));
                }
            });
            Promise.all(backupPromises).then(() => { rRef.remove(); db.ref('activeRooms/' + targetRoomID).remove(); resolve(); }).catch(() => { rRef.remove(); db.ref('activeRooms/' + targetRoomID).remove(); resolve(); });
        });
    });
}

function renderHubRooms() {
    const searchVal = document.getElementById('hub-search').value.trim().toLowerCase();
    const container = document.getElementById('hub-list');
    const tabs = document.getElementById('hub-tabs');
    
    container.innerHTML = "";

    let filtered = [];
    if (searchVal) {
        tabs.style.display = 'none';
        filtered = mjRooms.filter(r => {
            const e = (r.eventName || "").toLowerCase(); const m = (r.mjName || "").toLowerCase(); const d = new Date(r.createdAt || Date.now()).toLocaleDateString('fr-FR');
            return e.includes(searchVal) || m.includes(searchVal) || r.id.includes(searchVal) || d.includes(searchVal);
        });
    } else {
        tabs.style.display = 'flex';
        document.getElementById('tab-active').className = currentHubTab === 'active' ? 'hub-tab active' : 'hub-tab';
        document.getElementById('tab-archive').className = currentHubTab === 'archive' ? 'hub-tab active' : 'hub-tab';
        filtered = mjRooms.filter(r => currentHubTab === 'active' ? !r.isArchived : r.isArchived);
    }

    if (filtered.length === 0) { container.innerHTML = "<p style='color:#7f8c8d; font-style:italic; padding: 20px;'>Aucune salle ne correspond.</p>"; return; }

    filtered.forEach(r => {
        const d = new Date(r.createdAt || Date.now()); const dateStr = d.toLocaleDateString('fr-FR');
        const eventName = r.eventName || "Partie Sans Nom";
        const badgeClass = r.isArchived ? "badge-archive" : "badge-active";
        const badgeText = r.isArchived ? "🗄️ ARCHIVÉE" : "🟢 EN COURS";
        const stats = getRoomStats(r);
        
        const safeMjName = (r.mjName || "Animateur").replace(/'/g, "\\'");
        const safeEventName = eventName.replace(/'/g, "\\'");
        
        let btnAction = r.isArchived 
            ? `<button class="hub-btn" style="background:var(--blue); white-space: nowrap; flex-shrink: 0;" onclick="launchDashboard('${r.id}', '${safeMjName}', '${safeEventName}', true); event.stopPropagation();">👁️ CONSULTER</button>`
            : `<button class="hub-btn" style="background:var(--success); white-space: nowrap; flex-shrink: 0;" onclick="launchDashboard('${r.id}', '${safeMjName}', '${safeEventName}', false); event.stopPropagation();">▶️ REPRENDRE</button>`;

        container.innerHTML += `
            <div class="hub-line" onclick="toggleAccordion('${r.id}')">
                <span id="arrow-${r.id}" class="hub-arrow">▶</span>
                <div class="hub-line-text">
                    <b style="color:var(--accent); margin-right:8px;">${eventName}</b> 
                    <span style="color:#bdc3c7; font-size:0.85rem;">| ${dateStr} | #${r.id}</span>
                </div>
                <span class="hub-badge ${badgeClass}">${badgeText}</span>
            </div>
            <div id="details-${r.id}" class="hub-details" onclick="event.stopPropagation();">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:nowrap; gap:10px;">
                    <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <p style="margin:0 0 5px 0; color:#ecf0f1; font-size:0.9rem;">🎭 Animé par : <b>${r.mjName || "Animateur"}</b></p>
                        ${r.isArchived ? `<p style="margin:0 0 5px 0; color:#ecf0f1; font-size:0.9rem;">👥 Joueurs : <b>${stats.count}</b></p><p style="margin:0; color:var(--gold); font-size:0.9rem;">🏆 Vainqueur : <b>${stats.winner}</b></p>` : ''}
                    </div>
                    <div style="display:flex; gap:10px; flex-shrink:0; white-space: nowrap;">
                        ${btnAction}
						<button class="hub-btn" title="Télécharger l'historique (Mode Debug)" style="background:var(--purple); white-space: nowrap; flex-shrink: 0;" onclick="downloadAuditLog('${r.id}', event)">📝 HISTORIQUE</button>
                        <button class="hub-btn" style="background:var(--danger); white-space: nowrap; flex-shrink: 0;" onclick="deleteRoomFromHub('${r.id}', event)">🗑️ SUPPRIMER</button>
                    </div>
                </div>
            </div>
        `;
    });
}

