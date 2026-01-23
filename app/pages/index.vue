<script setup lang="ts">
definePageMeta({
  layout: false,
});

const isAuthenticated = ref(false);
</script>

<template>
  <div class="landing">
    <header class="landing-header">
      <div class="brand">
        <span class="brand-mark">RB</span>
        <span class="brand-name">RestauBuilder</span>
      </div>
      <div v-if="isAuthenticated" class="profile-card">
        <div class="profile-text">
          <strong>Claire Martin</strong>
          <span>Le Jardin Urbain</span>
        </div>
        <div class="profile-avatar">CM</div>
      </div>
      <NuxtLink v-else to="/login" class="btn btn-primary">Connexion</NuxtLink>
    </header>
    <section class="hero">
      <div class="hero-content">
        <p class="eyebrow">Plan de salle & réservation en ligne</p>
        <h1>Faites réserver la table exacte que vos clients veulent.</h1>
        <p class="hero-subtitle">
          RestauBuilder transforme votre plan de restaurant en expérience interactive :
          vos clients cliquent directement sur la table ou même la chaise de leur choix pour réserver.
        </p>
        <div class="hero-actions">
          <NuxtLink to="/builder" class="btn btn-primary">Créer mon plan de salle</NuxtLink>
          <NuxtLink to="/reservations" class="btn btn-secondary">Voir les réservations</NuxtLink>
        </div>
        <div class="hero-metrics">
          <div>
            <strong>+32%</strong>
            <span>de réservations directes</span>
          </div>
          <div>
            <strong>2 min</strong>
            <span>pour publier un plan</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>des tables maîtrisées</span>
          </div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="screen">
          <div class="screen-header">
            <span></span><span></span><span></span>
          </div>
          <div class="screen-body">
            <div class="room">
              <div class="table"></div>
              <div class="table"></div>
              <div class="table"></div>
              <div class="table"></div>
              <div class="table"></div>
              <div class="table"></div>
            </div>
            <div class="legend">
              <div class="legend-item">
                <span class="dot dot-available"></span>Disponible
              </div>
              <div class="legend-item">
                <span class="dot dot-selected"></span>Choisie
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="features-title">
      <div class="section-header">
        <p class="eyebrow">Pensé pour les restaurateurs</p>
        <h2 id="features-title">Tout ce qu'il faut pour convertir les visiteurs en réservations.</h2>
      </div>
      <div class="features">
        <article class="card">
          <h3>Plan de salle précis</h3>
          <p>Glissez-déposez tables et chaises pour refléter votre salle au millimètre près.</p>
        </article>
        <article class="card">
          <h3>Réservation instantanée</h3>
          <p>Vos clients visualisent les disponibilités et réservent la place exacte qu'ils veulent.</p>
        </article>
        <article class="card">
          <h3>Gestion simplifiée</h3>
          <p>Centralisez vos réservations, optimisez les flux et anticipez chaque service.</p>
        </article>
      </div>
    </section>

    <section class="section highlight" aria-labelledby="workflow-title">
      <div class="section-header">
        <p class="eyebrow">Un workflow ultra-simple</p>
        <h2 id="workflow-title">Lancez votre espace de réservation en 3 étapes.</h2>
      </div>
      <div class="steps">
        <div class="step">
          <span class="step-number">01</span>
          <div>
            <h3>Créez votre plan</h3>
            <p>Importez votre salle et positionnez tables & chaises en quelques clics.</p>
          </div>
        </div>
        <div class="step">
          <span class="step-number">02</span>
          <div>
            <h3>Publiez en ligne</h3>
            <p>Partagez votre lien de réservation partout : site, réseaux, QR code.</p>
          </div>
        </div>
        <div class="step">
          <span class="step-number">03</span>
          <div>
            <h3>Remplissez votre salle</h3>
            <p>Recevez des réservations ciblées et gérez vos capacités en temps réel.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="cta-title">
      <div class="cta">
        <div>
          <p class="eyebrow">Prêt à passer au SaaS</p>
          <h2 id="cta-title">Donnez à vos clients le choix de leur table.</h2>
          <p>Offrez une expérience premium qui fidélise et augmente la valeur moyenne par couvert.</p>
        </div>
        <div class="cta-actions">
          <NuxtLink to="/builder" class="btn btn-primary">Démarrer la configuration</NuxtLink>
          <NuxtLink to="/reservation/demo" class="btn btn-secondary">Voir une démo client</NuxtLink>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="footer-content">
        <div>
          <div class="brand">
            <span class="brand-mark">RB</span>
            <span class="brand-name">RestauBuilder</span>
          </div>
          <p class="footer-tagline">
            La plateforme SaaS qui transforme vos plans de salle en expérience de réservation premium.
          </p>
        </div>
        <div class="footer-links">
          <div>
            <h4>Produit</h4>
            <ul>
              <li><NuxtLink to="/builder">Créer un plan</NuxtLink></li>
              <li><NuxtLink to="/reservations">Réservations</NuxtLink></li>
              <li><NuxtLink to="/reservation/demo">Démo client</NuxtLink></li>
            </ul>
          </div>
          <div>
            <h4>Entreprise</h4>
            <ul>
              <li><NuxtLink to="/register">Créer un compte</NuxtLink></li>
              <li><NuxtLink to="/login">Connexion</NuxtLink></li>
              <li><a href="mailto:hello@restaubuilder.com">Contact</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2025 RestauBuilder. Tous droits réservés.</span>
        <div class="footer-meta">
          <span>Made for restaurateurs</span>
          <span>•</span>
          <span>FR</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  background: #f8fafc;
  color: #0f172a;
  overflow-y: auto;
}

.landing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 6vw 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 700;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: #2563eb;
  color: white;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  letter-spacing: 0.08em;
}

.brand-name {
  font-size: 1.05rem;
}

.profile-card {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  background: white;
  border-radius: 999px;
  padding: 0.35rem 0.45rem 0.35rem 1rem;
  box-shadow: 0 12px 25px rgba(15, 23, 42, 0.12);
}

.profile-text {
  display: grid;
  font-size: 0.85rem;
}

.profile-text strong {
  font-size: 0.9rem;
}

.profile-text span {
  color: #64748b;
  font-size: 0.75rem;
}

.profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #1f2937;
  font-weight: 700;
  display: grid;
  place-items: center;
  font-size: 0.8rem;
}

.hero {
  display: grid;
  gap: 3rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  padding: 4.5rem 6vw 3.5rem;
  align-items: center;
}

.hero-content h1 {
  font-size: clamp(2.4rem, 3vw, 3.5rem);
  margin: 0 0 1rem;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  font-weight: 600;
  color: #2563eb;
  margin-bottom: 0.75rem;
}

.hero-subtitle {
  font-size: 1.05rem;
  line-height: 1.6;
  color: #475569;
  margin-bottom: 1.5rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.hero-metrics {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.hero-metrics strong {
  display: block;
  font-size: 1.3rem;
}

.hero-metrics span {
  color: #64748b;
  font-size: 0.9rem;
}

.hero-visual {
  display: flex;
  justify-content: center;
}

.screen {
  width: min(420px, 90%);
  border-radius: 18px;
  background: white;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.screen-header {
  background: #0f172a;
  padding: 0.5rem 0.75rem;
  display: flex;
  gap: 0.4rem;
}

.screen-header span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #334155;
}

.screen-body {
  padding: 1.5rem;
  display: grid;
  gap: 1.5rem;
}

.room {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  background: #f1f5f9;
  border-radius: 14px;
  padding: 1rem;
}

.table {
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e2e8f0, #cbd5f5);
  border: 1px solid #cbd5f5;
  position: relative;
}

.table::after {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 8px;
  border: 2px dashed rgba(37, 99, 235, 0.4);
}

.legend {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: #475569;
}

.legend-item {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.dot-available {
  background: #94a3b8;
}

.dot-selected {
  background: #2563eb;
}

.section {
  padding: 3.5rem 6vw;
}

.section-header {
  max-width: 720px;
  margin-bottom: 2.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: clamp(2rem, 2.5vw, 2.8rem);
}

.features {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.card {
  background: white;
  padding: 1.75rem;
  border-radius: 18px;
  box-shadow: 0 15px 30px rgba(15, 23, 42, 0.08);
}

.card h3 {
  margin-top: 0;
}

.card p {
  color: #475569;
}

.highlight {
  background: #0f172a;
  color: white;
}

.highlight .eyebrow {
  color: #93c5fd;
}

.steps {
  display: grid;
  gap: 1.5rem;
}

.step {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
}

.step-number {
  font-size: 1.2rem;
  font-weight: 700;
  color: #38bdf8;
}

.cta {
  background: white;
  border-radius: 24px;
  padding: 2.5rem;
  display: grid;
  gap: 2rem;
  align-items: center;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.1);
}

.cta-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-start;
}

.landing-footer {
  background: #0f172a;
  color: white;
  padding: 3rem 6vw 2rem;
}

.footer-content {
  display: grid;
  gap: 2.5rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  align-items: start;
}

.footer-tagline {
  color: #cbd5f5;
  margin-top: 1rem;
  line-height: 1.6;
}

.footer-links {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.footer-links h4 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.footer-links ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.5rem;
}

.footer-links a {
  color: #e2e8f0;
  text-decoration: none;
  font-size: 0.9rem;
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: space-between;
  color: #cbd5f5;
  font-size: 0.85rem;
}

.footer-meta {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
}

@media (max-width: 720px) {
  .hero {
    padding-top: 3rem;
  }
  .cta {
    padding: 2rem;
  }
}
</style>
