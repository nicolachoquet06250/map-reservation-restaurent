<script setup lang="ts">
definePageMeta({
  layout: false,
});

const isMobile = useIsMobile();
</script>

<template>
  <div class="landing">
    <LandingHeader />
    <section class="hero">
      <div class="hero-content">
        <div class="hero-badge">Nouveau : Gestion multi-établissements</div>
        <p class="eyebrow">Plan de salle & réservation en ligne</p>
        <h1>Faites réserver la table exacte que vos clients veulent.</h1>
        <p class="hero-subtitle">
          RestauBuilder transforme votre plan de restaurant en expérience interactive :
          vos clients cliquent directement sur la table ou même la chaise de leur choix pour réserver.
        </p>
        <div class="hero-actions">
          <NuxtLink to="/dashboard" class="btn btn-primary btn-lg">Accéder au Dashboard</NuxtLink>
          <NuxtLink v-if="!isMobile" to="/builder" class="btn btn-secondary btn-lg">Essayer le Builder</NuxtLink>
          <div v-else class="builder-mobile-notice">
            Le Builder est accessible uniquement sur ordinateur
          </div>
        </div>
        <div class="hero-metrics">
          <div class="metric-item">
            <span class="metric-value">+32%</span>
            <span class="metric-label">de réservations directes</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">2 min</span>
            <span class="metric-label">pour publier un plan</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">100%</span>
            <span class="metric-label">des tables maîtrisées</span>
          </div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="visual-wrapper">
          <div class="screen shadow-2xl">
            <div class="screen-header">
              <div class="dots"><span></span><span></span><span></span></div>
              <div class="address-bar">map-reservation-restaurents.nchoquet.fr/reservations/le-jardin-urbain</div>
            </div>
            <div class="screen-body">
              <div class="room">
                <div class="table" style="top: 20%; left: 15%;"></div>
                <div class="table selected" style="top: 20%; left: 45%;"></div>
                <div class="table" style="top: 20%; left: 75%;"></div>
                <div class="table" style="top: 60%; left: 15%;"></div>
                <div class="table" style="top: 60%; left: 45%;"></div>
                <div class="table occupied" style="top: 60%; left: 75%;"></div>
              </div>
              <div class="legend">
                <div class="legend-item">
                  <span class="dot dot-available"></span>Disponible
                </div>
                <div class="legend-item">
                  <span class="dot dot-selected"></span>Choisie
                </div>
                <div class="legend-item">
                  <span class="dot dot-occupied"></span>Occupée
                </div>
              </div>
            </div>
          </div>
          <div class="floating-card card-1">
            <div class="card-icon">📈</div>
            <div class="card-info">
              <strong>+15%</strong>
              <span>Revenu/table</span>
            </div>
          </div>
          <div class="floating-card card-2">
            <div class="card-icon">⭐</div>
            <div class="card-info">
              <strong>4.9/5</strong>
              <span>Avis clients</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="features-title">
      <div class="section-header">
        <p class="eyebrow">Fonctionnalités Clés</p>
        <h2 id="features-title">Une suite d'outils complète pour votre établissement.</h2>
        <p class="section-subtitle">Conçu pour simplifier votre quotidien et améliorer l'expérience de vos clients.</p>
      </div>
      <div class="features">
        <article class="feature-card">
          <div class="feature-icon">📐</div>
          <h3>Plan de salle précis</h3>
          <p>Glissez-déposez tables et chaises pour refléter votre salle au millimètre près avec notre éditeur intuitif.</p>
        </article>
        <article class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>Réservation instantanée</h3>
          <p>Vos clients visualisent les disponibilités en temps réel et réservent la place exacte qu'ils préfèrent.</p>
        </article>
        <article class="feature-card">
          <div class="feature-icon">📊</div>
          <h3>Analyse de performance</h3>
          <p>Identifiez vos tables les plus rentables et optimisez votre taux d'occupation par service.</p>
        </article>
        <article class="feature-card">
          <div class="feature-icon">📱</div>
          <h3>Mobile First</h3>
          <p>Une expérience fluide sur smartphone pour vos clients, et une gestion nomade pour vous.</p>
        </article>
        <article class="feature-card">
          <div class="feature-icon">🤝</div>
          <h3>Fidélisation</h3>
          <p>Gardez l'historique des préférences de vos clients pour un accueil toujours personnalisé.</p>
        </article>
        <article class="feature-card">
          <div class="feature-icon">🔗</div>
          <h3>Intégration facile</h3>
          <p>Installez RestauBuilder sur votre site actuel ou vos réseaux sociaux en moins de 5 minutes.</p>
        </article>
      </div>
    </section>

    <section class="section highlight" aria-labelledby="workflow-title">
      <div class="section-header">
        <p class="eyebrow">Démarrage Rapide</p>
        <h2 id="workflow-title">Votre salle en ligne en 3 étapes.</h2>
      </div>
      <div class="workflow-steps">
        <div class="workflow-step">
          <div class="step-num">01</div>
          <div class="step-content">
            <h3>Créez votre plan</h3>
            <p>Utilisez notre builder intuitif pour dessiner votre salle. Importez vos tables, chaises et zones de service.</p>
          </div>
        </div>
        <div class="workflow-step">
          <div class="step-num">02</div>
          <div class="step-content">
            <h3>Configurez vos services</h3>
            <p>Définissez vos horaires, vos capacités et vos règles de réservation en quelques clics.</p>
          </div>
        </div>
        <div class="workflow-step">
          <div class="step-num">03</div>
          <div class="step-content">
            <h3>Partagez et encaissez</h3>
            <p>Publiez votre lien de réservation et laissez vos clients choisir leur table préférée.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="cta-title">
      <div class="cta-banner">
        <div class="cta-content">
          <p class="eyebrow white">Prêt à transformer votre restaurant ?</p>
          <h2 id="cta-title">Donnez à vos clients le choix de leur table aujourd'hui.</h2>
          <p>Rejoignez les centaines de restaurateurs qui optimisent déjà leur salle avec RestauBuilder.</p>
          <div class="cta-actions">
            <NuxtLink to="/register" class="btn btn-white btn-lg">Démarrer gratuitement</NuxtLink>
            <NuxtLink to="/reservation/demo" class="btn btn-outline-white btn-lg">Voir la démo client</NuxtLink>
          </div>
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
              <li v-if="!isMobile"><NuxtLink to="/builder">Créer un plan</NuxtLink></li>
              <li v-else class="footer-notice">Builder (Desktop seul)</li>
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
  background: #ffffff;
  color: #0f172a;
  overflow-y: auto;
  font-family: 'Inter', sans-serif;
}

/* Hero Section */
.hero {
  padding: 8rem 6vw 6rem;
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 4rem;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -200px;
  right: -100px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, rgba(255, 255, 255, 0) 70%);
  z-index: -1;
}

.hero-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  border: 1px solid #dbeafe;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.85rem;
  font-weight: 700;
  color: #2563eb;
  margin-bottom: 1rem;
}

.eyebrow.white {
  color: rgba(255, 255, 255, 0.9);
}

.hero h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
  line-height: 1.1;
  font-weight: 850;
  margin-bottom: 1.5rem;
  color: #0f172a;
  letter-spacing: -0.03em;
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.6;
  color: #475569;
  margin-bottom: 2.5rem;
  max-width: 600px;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 4rem;
}

.hero-actions .btn {
  text-decoration: none;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.05rem;
  border-radius: 12px;
}

.hero-metrics {
  display: flex;
  gap: 3rem;
  border-top: 1px solid #f1f5f9;
  padding-top: 2rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
}

.metric-label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

/* Hero Visual */
.hero-visual {
  position: relative;
}

.visual-wrapper {
  position: relative;
  perspective: 1000px;
}

.screen {
  background: white;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  transform: rotateY(-5deg) rotateX(2deg);
  transition: transform 0.5s ease;
}

.screen:hover {
  transform: rotateY(0deg) rotateX(0deg);
}

.screen-header {
  background: #f8fafc;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.dots {
  display: flex;
  gap: 0.5rem;
}

.dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #cbd5e1;
}

.address-bar {
  flex-grow: 1;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: center;
}

.screen-body {
  height: 350px;
  padding: 2rem;
  background: #ffffff;
  position: relative;
}

.room {
  width: 100%;
  height: 100%;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
  position: relative;
}

.table {
  position: absolute;
  width: 40px;
  height: 40px;
  background: white;
  border: 2px solid #2563eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.1);
}

.table.selected {
  background: #2563eb;
  transform: scale(1.1);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
}

.table.occupied {
  background: #f1f5f9;
  border-color: #cbd5e1;
  cursor: not-allowed;
}

.legend {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  display: flex;
  gap: 1rem;
  background: white;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #f1f5f9;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-available { background: #2563eb; }
.dot-selected { background: #2563eb; outline: 2px solid rgba(37, 99, 235, 0.3); }
.dot-occupied { background: #cbd5e1; }

.floating-card {
  position: absolute;
  background: white;
  padding: 1rem;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 10;
  border: 1px solid #f1f5f9;
}

.card-1 {
  top: -20px;
  right: -30px;
  animation: float 6s ease-in-out infinite;
}

.card-2 {
  bottom: 40px;
  left: -40px;
  animation: float 6s ease-in-out infinite 3s;
}

.card-icon {
  width: 40px;
  height: 40px;
  background: #f0f9ff;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
}

.card-info {
  display: flex;
  flex-direction: column;
}

.card-info strong {
  font-size: 1.1rem;
  color: #0f172a;
}

.card-info span {
  font-size: 0.75rem;
  color: #64748b;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

/* Section Common */
.section {
  padding: 6rem 6vw;
  max-width: 1400px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
}

.section-header h2 {
  font-size: clamp(2rem, 4vw, 2.75rem);
  line-height: 1.2;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 1rem;
  letter-spacing: -0.02em;
}

.section-subtitle {
  font-size: 1.15rem;
  color: #64748b;
  line-height: 1.6;
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: #ffffff;
  padding: 2.5rem;
  border-radius: 24px;
  border: 1px solid #f1f5f9;
  transition: all 0.3s ease;
}

.feature-card:hover {
  border-color: #dbeafe;
  box-shadow: 0 20px 40px rgba(37, 99, 235, 0.05);
  transform: translateY(-5px);
}

.feature-icon {
  width: 56px;
  height: 56px;
  background: #eff6ff;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #2563eb;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #0f172a;
}

.feature-card p {
  color: #64748b;
  line-height: 1.6;
  font-size: 1rem;
}

/* Workflow */
.section.highlight {
  background: #0f172a;
  color: white;
  border-radius: 48px;
  margin: 2rem auto;
  width: auto;
  max-width: calc(100% - 4rem);
}

.section.highlight h2, 
.section.highlight .eyebrow {
  color: white;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 4rem;
}

.workflow-step {
  position: relative;
  text-align: center;
}

.step-num {
  font-size: 4rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.05);
  line-height: 1;
  margin-bottom: -1.5rem;
}

.step-content h3 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.step-content p {
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}

/* CTA Banner */
.cta-banner {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border-radius: 40px;
  padding: 5rem;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 30px 60px -12px rgba(37, 99, 235, 0.4);
}

.cta-banner::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2v-4h4v-2h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  z-index: 0;
}

.cta-content {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto;
}

.cta-banner h2 {
  font-size: 3rem;
  font-weight: 850;
  margin-bottom: 1.5rem;
  letter-spacing: -0.03em;
}

.cta-banner p {
  font-size: 1.25rem;
  margin-bottom: 3rem;
  color: rgba(255, 255, 255, 0.9);
}

.cta-actions {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.cta-actions .btn {
  text-decoration: none;
}

.btn-white {
  background: white;
  color: #2563eb;
  border: none;
}

.btn-white:hover {
  background: #f8fafc;
  transform: translateY(-2px);
}

.btn-outline-white {
  background: transparent;
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-outline-white:hover {
  border-color: white;
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.builder-mobile-notice {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #f1f5f9;
  color: #64748b;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px dashed #cbd5e1;
  width: 100%;
}

.footer-notice {
  color: #94a3b8;
  font-size: 0.9rem;
  font-style: italic;
}

/* Footer */
.landing-footer {
  padding: 6rem 6vw 3rem;
  background: #ffffff;
  border-top: 1px solid #f1f5f9;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  gap: 4rem;
  margin-bottom: 4rem;
  flex-wrap: wrap;
}

.footer-tagline {
  margin-top: 1.5rem;
  max-width: 320px;
  color: #64748b;
  line-height: 1.6;
}

.footer-links {
  display: flex;
  gap: 6rem;
}

.footer-links h4 {
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-links ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.footer-links a {
  color: #64748b;
  text-decoration: none;
  font-size: 1rem;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: #2563eb;
}

.footer-bottom {
  padding-top: 2rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 0.875rem;
}

.footer-meta {
  display: flex;
  gap: 1rem;
  align-items: center;
}

@media (max-width: 1024px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
    padding-top: 4rem;
  }
  .hero-subtitle, .hero-actions, .hero-metrics {
    margin-left: auto;
    margin-right: auto;
    justify-content: center;
  }
  .hero-visual {
    margin-top: 2rem;
  }
  .hero-actions {
    flex-direction: column;
    width: 100%;
    gap: 0.75rem;
  }
.hero-actions .btn {
    width: 100%;
    justify-content: center;
    padding: 1rem 1.5rem;
    height: auto;
    min-height: 3.5rem;
  }
}

@media (max-width: 768px) {
  .footer-links {
    gap: 3rem;
  }
  .cta-banner {
    padding: 3rem 1.5rem;
  }
  .cta-banner h2 {
    font-size: 2rem;
  }
  .cta-actions {
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    margin: 0 auto;
  }
  .cta-actions .btn {
    width: 100%;
    justify-content: center;
    padding: 1rem;
    font-size: 1.1rem;
    border-radius: 16px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  .btn-outline-white {
    border-color: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(4px);
  }
}
</style>
