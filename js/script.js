/* =========================================================
   Dra. Auanny Alfaia — Cirurgiã-Dentista
   Script principal (JavaScript puro, sem dependências)
   ========================================================= */

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Ajuda a percorrer NodeLists em qualquer navegador, incluindo
  // motores mais antigos sem NodeList.prototype.forEach.
  function toArray(nodeList) { return Array.prototype.slice.call(nodeList); }

  /* ---------------------------------------------------------
     Estrutura para eventos (Google Analytics / GTM / Meta Pixel)
     -----------------------------------------------------------
     Esta função é o único ponto de saída de eventos do site.
     Hoje ela NÃO envia dados a nenhum lugar: window.dataLayer só
     existe depois que o snippet do Google Tag Manager é colado
     no <head> (ver comentário "GOOGLE TAG MANAGER" no HTML), e
     window.fbq só existe depois do snippet do Meta Pixel. Até lá,
     trackEvent() simplesmente não faz nada — nenhum ID falso é
     usado e nenhuma chamada de rede é feita.

     Quando o GTM/GA4 for instalado, os eventos abaixo (clique no
     WhatsApp, no Instagram, no botão de agendar e visualização
     das seções de tratamentos/resultados) passam a ser enviados
     automaticamente, sem precisar tocar no restante do código.
  --------------------------------------------------------- */
  function trackEvent(eventName, params) {
    params = params || {};
    if (window.dataLayer && typeof window.dataLayer.push === "function") {
      var payload = { event: eventName };
      for (var key in params) { if (params.hasOwnProperty(key)) payload[key] = params[key]; }
      window.dataLayer.push(payload);
    }
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }
    if (typeof window.fbq === "function" && params.metaPixelEvent) {
      window.fbq("track", params.metaPixelEvent);
    }
  }

  // Sobe pela árvore de elementos-pai até achar uma <section> com id.
  // Evita depender de Element.prototype.closest, ausente em alguns
  // navegadores/webviews mais antigos.
  function closestSectionId(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.tagName === "SECTION" && node.id) return node.id;
      node = node.parentElement;
    }
    return null;
  }

  /* ---------------------------------------------------------
     Número de WhatsApp do consultório.
     Ajuste aqui caso o número precise ser corrigido.
  --------------------------------------------------------- */
  var WHATSAPP_NUMBER = "5591998067404";

  toArray(document.querySelectorAll(".wa-link")).forEach(function (link) {
    var msg = link.getAttribute("data-wa-msg") || "Olá! Gostaria de agendar uma consulta.";
    link.setAttribute(
      "href",
      "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg)
    );
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener");

    // Evento: clique em qualquer botão/link de WhatsApp do site.
    var location = link.getAttribute("data-track-location");
    if (!location) {
      location = closestSectionId(link) || (link.classList.contains("wa-float") ? "floating_button" : "page");
    }
    link.addEventListener("click", function () {
      trackEvent("whatsapp_click", { location: location, metaPixelEvent: "Contact" });
    });
  });

  // Evento: clique em qualquer link do Instagram.
  toArray(document.querySelectorAll('a[href*="instagram.com"]')).forEach(function (link) {
    link.addEventListener("click", function () {
      trackEvent("instagram_click", { location: "page" });
    });
  });

  // Eventos: primeira vez que as seções de Tratamentos e Resultados
  // entram na tela (observer dedicado, configurado mais abaixo).
  var sectionViewTargets = { tratamentos: "view_treatments", resultados: "view_results" };

  /* ---------------------------------------------------------
     Header: fundo ao rolar a página
  --------------------------------------------------------- */
  var header = document.getElementById("siteHeader");
  function updateHeader() {
    if (window.scrollY > 30) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------------------------------------------------------
     Menu hambúrguer (mobile)
  --------------------------------------------------------- */
  var menuToggle = document.getElementById("menuToggle");
  var mainNav = document.getElementById("mainNav");

  function closeMenu() {
    mainNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  }
  function openMenu() {
    mainNav.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Fechar menu");
  }
  menuToggle.addEventListener("click", function () {
    var isOpen = mainNav.classList.contains("is-open");
    if (isOpen) { closeMenu(); } else { openMenu(); }
  });
  toArray(mainNav.querySelectorAll("a")).forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------------------------------------------------------
     Animações discretas ao rolar (Intersection Observer)
  --------------------------------------------------------- */
  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    var animatedEls = toArray(document.querySelectorAll("[data-animate]"));
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    animatedEls.forEach(function (el) { observer.observe(el); });
  } else {
    toArray(document.querySelectorAll("[data-animate]")).forEach(function (el) {
      el.classList.add("in-view");
    });
  }

  /* ---------------------------------------------------------
     Evento: visualização das seções de Tratamentos e Resultados
     (observer independente do de animação — deve funcionar mesmo
     com prefers-reduced-motion ativo, e dispara só uma vez).
  --------------------------------------------------------- */
  if ("IntersectionObserver" in window) {
    var sectionViewObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var eventName = sectionViewTargets[entry.target.id];
            if (eventName) trackEvent(eventName, { location: entry.target.id });
            sectionViewObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    Object.keys(sectionViewTargets).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) sectionViewObserver.observe(el);
    });
  }

  /* ---------------------------------------------------------
     Comparador Antes / Depois
     Funciona para qualquer elemento .compare presente na
     página (galeria e lightbox), via mouse, teclado e toque
     (Pointer Events cobre os três casos).
  --------------------------------------------------------- */
  function initCompare(el) {
    var beforeWrap = el.querySelector(".compare-before-wrap");
    var beforeImg = el.querySelector(".compare-before");
    var handle = el.querySelector(".compare-handle");
    if (!beforeWrap || !handle) return;

    var dragging = false;

    function setPosition(percent) {
      percent = Math.max(0, Math.min(100, percent));
      beforeWrap.style.width = percent + "%";
      handle.style.left = percent + "%";
      if (beforeImg) {
        // Mantém a imagem "antes" na largura total do container,
        // apenas recortada pelo wrapper (evita distorção).
        var rect = el.getBoundingClientRect();
        if (rect.width > 0) {
          beforeImg.style.width = rect.width + "px";
        }
      }
    }

    function percentFromClientX(clientX) {
      var rect = el.getBoundingClientRect();
      var x = clientX - rect.left;
      return (x / rect.width) * 100;
    }

    function onPointerDown(e) {
      dragging = true;
      el.setPointerCapture && e.pointerId != null && el.setPointerCapture(e.pointerId);
      setPosition(percentFromClientX(e.clientX));
    }
    function onPointerMove(e) {
      if (!dragging) return;
      setPosition(percentFromClientX(e.clientX));
    }
    function onPointerUp() { dragging = false; }

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Navegação por teclado (setas esquerda/direita)
    el.addEventListener("keydown", function (e) {
      var current = parseFloat(beforeWrap.style.width) || 50;
      if (e.key === "ArrowLeft") { setPosition(current - 5); e.preventDefault(); }
      if (e.key === "ArrowRight") { setPosition(current + 5); e.preventDefault(); }
    });

    // Reposiciona a imagem "antes" corretamente ao redimensionar
    window.addEventListener("resize", function () {
      setPosition(parseFloat(beforeWrap.style.width) || 50);
    });

    setPosition(50);
  }

  toArray(document.querySelectorAll(".compare")).forEach(initCompare);

  /* ---------------------------------------------------------
     Lightbox / Modal do portfólio
  --------------------------------------------------------- */
  var resultItems = Array.prototype.slice.call(document.querySelectorAll(".result-item"));
  var lightbox = document.getElementById("lightbox");
  var lightboxCompare = document.getElementById("lightboxCompare");
  var lightboxBefore = document.getElementById("lightboxBefore");
  var lightboxAfter = document.getElementById("lightboxAfter");
  var lightboxTitle = document.getElementById("lightboxTitle");
  var lightboxDesc = document.getElementById("lightboxDesc");
  var lightboxClose = document.getElementById("lightboxClose");
  var lightboxPrev = document.getElementById("lightboxPrev");
  var lightboxNext = document.getElementById("lightboxNext");
  var currentIndex = 0;
  var lastFocusedEl = null;

  function fillLightbox(index) {
    var item = resultItems[index];
    if (!item) return;
    var before = item.querySelector(".compare-before");
    var after = item.querySelector(".compare-after");
    var title = item.querySelector("h3");
    var desc = item.querySelector("figcaption p");

    lightboxBefore.src = before.src;
    lightboxBefore.alt = before.alt;
    lightboxAfter.src = after.src;
    lightboxAfter.alt = after.alt;
    lightboxTitle.textContent = title ? title.textContent : "";
    lightboxDesc.textContent = desc ? desc.textContent : "";
    currentIndex = index;

    // Reinicia o comparador do lightbox na posição central
    var beforeWrap = lightboxCompare.querySelector(".compare-before-wrap");
    var handle = lightboxCompare.querySelector(".compare-handle");
    beforeWrap.style.width = "50%";
    handle.style.left = "50%";
  }

  function openLightbox(index) {
    lastFocusedEl = document.activeElement;
    fillLightbox(index);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  resultItems.forEach(function (item, index) {
    var compareEl = item.querySelector(".compare");
    // Duplo clique/toque na imagem também amplia o resultado.
    compareEl.addEventListener("dblclick", function () { openLightbox(index); });

    // Clique na legenda (nome/descrição do procedimento) abre o modal,
    // já que o clique simples sobre a imagem é reservado para arrastar o comparador.
    var caption = item.querySelector("figcaption");
    caption.style.cursor = "pointer";
    caption.addEventListener("click", function () { openLightbox(index); });

    // Botão "ampliar" (já presente no HTML), sempre visível, para abrir a
    // visualização em modal sem depender de duplo clique. Precisa impedir
    // que o toque/clique também inicie o arraste do comparador.
    var expandBtn = item.querySelector(".compare-expand");
    if (expandBtn) {
      expandBtn.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      expandBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        openLightbox(index);
      });
    }
  });

  lightboxClose.addEventListener("click", closeLightbox);
  toArray(lightbox.querySelectorAll("[data-close-lightbox]")).forEach(function (el) {
    el.addEventListener("click", closeLightbox);
  });
  lightboxPrev.addEventListener("click", function () {
    var newIndex = (currentIndex - 1 + resultItems.length) % resultItems.length;
    fillLightbox(newIndex);
  });
  lightboxNext.addEventListener("click", function () {
    var newIndex = (currentIndex + 1) % resultItems.length;
    fillLightbox(newIndex);
  });
  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") lightboxPrev.click();
    if (e.key === "ArrowRight") lightboxNext.click();
  });

  // Inicializa o comparador do lightbox (uma vez)
  initCompare(lightboxCompare);

  /* ---------------------------------------------------------
     Carrossel de depoimentos
     Os controles (setas, indicadores) e o autoplay só fazem
     sentido quando existe mais de um slide para navegar. Hoje
     há apenas o estado "espaço reservado"; quando depoimentos
     reais forem adicionados (ver comentário-modelo no HTML),
     este mesmo código passa a ativar tudo automaticamente.
  --------------------------------------------------------- */
  var track = document.getElementById("testimonialTrack");
  var slides = toArray(track.children);
  var controlsWrap = document.getElementById("testimonialControls");
  var dotsWrap = document.getElementById("testimonialDots");
  var prevBtn = document.getElementById("testimonialPrev");
  var nextBtn = document.getElementById("testimonialNext");
  var current = 0;
  var dots = [];

  function goToSlide(index) {
    current = (index + slides.length) % slides.length;
    track.style.transform = "translateX(-" + current * 100 + "%)";
    dots.forEach(function (d, i) { d.classList.toggle("is-active", i === current); });
  }

  if (slides.length > 1) {
    controlsWrap.hidden = false;

    slides.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "testimonial-dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Ir para depoimento " + (i + 1));
      dot.addEventListener("click", function () { goToSlide(i); });
      dotsWrap.appendChild(dot);
    });
    dots = toArray(dotsWrap.children);

    prevBtn.addEventListener("click", function () { goToSlide(current - 1); });
    nextBtn.addEventListener("click", function () { goToSlide(current + 1); });

    // Suporte a toque (swipe) no carrossel
    var touchStartX = 0;
    track.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    track.addEventListener("touchend", function (e) {
      var diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 40) {
        if (diff < 0) goToSlide(current + 1); else goToSlide(current - 1);
      }
    }, { passive: true });

    // Autoplay discreto, pausado ao interagir
    var autoplay;
    function startAutoplay() {
      if (prefersReducedMotion) return;
      stopAutoplay();
      autoplay = setInterval(function () { goToSlide(current + 1); }, 6500);
    }
    function stopAutoplay() { if (autoplay) clearInterval(autoplay); }
    [prevBtn, nextBtn, track].forEach(function (el) {
      el.addEventListener("mouseenter", stopAutoplay);
      el.addEventListener("mouseleave", startAutoplay);
    });
    startAutoplay();
  }

  /* ===========================================================
     FORMULÁRIO DE DEPOIMENTO
     ===========================================================
     Este site é 100% estático (sem backend). O formulário abaixo
     NUNCA publica nada automaticamente no carrossel — ele apenas
     recolhe o depoimento e o envia para a Dra. Auanny Alfaia
     avaliar. A publicação continua manual, editando o HTML.

     COMO ATIVAR O ENVIO AUTOMÁTICO POR E-MAIL (Formspree):
     1. Crie uma conta gratuita em https://formspree.io
     2. Crie um novo formulário e copie o endpoint fornecido
        (formato: https://formspree.io/f/xxxxxxxx)
     3. Substitua o valor de FORMSPREE_ENDPOINT logo abaixo por
        esse endpoint real.
     Pronto — nada mais precisa mudar no HTML ou no restante do JS.

     ENQUANTO O FORMSPREE NÃO FOR CONFIGURADO:
     O formulário detecta automaticamente que o endpoint ainda é o
     placeholder e, em vez de tentar enviar para um endereço que
     não existe, abre o WhatsApp com uma mensagem já pronta contendo
     todos os dados preenchidos. Ou seja: o formulário funciona de
     verdade desde o primeiro dia, mesmo antes de qualquer
     configuração externa. O mesmo fallback também é usado se, no
     futuro, o envio ao Formspree falhar por qualquer motivo (fora
     do ar, sem internet etc.) — o depoimento nunca se perde.

     COMO PUBLICAR UM DEPOIMENTO APROVADO NO SITE:
     1. Abra index.html e localize o comentário "MODELO PARA
        DEPOIMENTOS REAIS" dentro de #testimonialTrack.
     2. Duplique o bloco de exemplo (a <div class="testimonial-slide">
        comentada) para fora do comentário, como um slide real.
     3. Preencha com o texto do depoimento, o nome (ou iniciais)
        autorizado pelo paciente, e opcionalmente a data.
     4. Para a nota em estrelas, substitua o texto "★★★★★" pela
        quantidade correspondente de estrelas cheias (★) — por
        exemplo, 4 de 5 seria "★★★★" — e ajuste também o texto do
        aria-label (ex.: "Avaliação: 4 de 5 estrelas") para manter
        a leitura correta por leitores de tela.
     5. Se esse for o segundo (ou mais) depoimento real, o slide de
        "espaço reservado" pode ser removido — com 1 único slide
        publicado, ele deixa de fazer sentido. As setas/indicadores
        do carrossel aparecem sozinhos assim que houver 2+ slides.
     Nenhuma alteração de CSS ou JavaScript é necessária nesse
     processo — o carrossel já existente cuida de tudo.
  --------------------------------------------------------- */
  var FORMSPREE_ENDPOINT = "https://formspree.io/f/SEU_ID_FORMSPREE";

  var testimonialModal = document.getElementById("testimonialModal");
  var openFormBtn = document.getElementById("openTestimonialForm");
  var closeFormBtn = document.getElementById("testimonialModalClose");
  var testimonialForm = document.getElementById("testimonialForm");
  var tfSubmitBtn = document.getElementById("tfSubmitBtn");
  var tfFeedback = document.getElementById("tfFeedback");
  var tfMessage = document.getElementById("tf-message");
  var tfCharCounter = document.getElementById("tfCharCounter");
  var tfLastFocusedEl = null;

  function openTestimonialModal() {
    tfLastFocusedEl = document.activeElement;
    testimonialModal.classList.add("is-open");
    testimonialModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var firstField = document.getElementById("tf-name");
    if (firstField) firstField.focus();
    trackEvent("testimonial_form_open", { location: "depoimentos" });
  }
  function closeTestimonialModal() {
    testimonialModal.classList.remove("is-open");
    testimonialModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (tfLastFocusedEl) tfLastFocusedEl.focus();
  }

  if (openFormBtn) openFormBtn.addEventListener("click", openTestimonialModal);
  if (closeFormBtn) closeFormBtn.addEventListener("click", closeTestimonialModal);
  toArray(testimonialModal.querySelectorAll("[data-close-testimonial-modal]")).forEach(function (el) {
    el.addEventListener("click", closeTestimonialModal);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && testimonialModal.classList.contains("is-open")) closeTestimonialModal();
  });

  // Contador de caracteres do depoimento (puramente informativo —
  // o limite real é garantido pelo atributo maxlength do textarea).
  if (tfMessage && tfCharCounter) {
    var tfMaxLength = tfMessage.getAttribute("maxlength") || "600";
    tfMessage.addEventListener("input", function () {
      tfCharCounter.textContent = tfMessage.value.length + "/" + tfMaxLength;
    });
  }

  function setFormFeedback(message, type) {
    tfFeedback.textContent = message;
    tfFeedback.className = "form-feedback" + (type ? " is-" + type : "");
  }

  // Monta uma mensagem de WhatsApp com os dados do formulário — usada
  // como alternativa quando o Formspree não está configurado (ou
  // falha). Garante que o depoimento sempre chegue até a dentista.
  function buildWhatsAppMessageFromForm(formData) {
    var lines = ["Olá! Gostaria de deixar um depoimento sobre meu atendimento."];
    lines.push("Nome: " + (formData.get("name") || "-"));
    lines.push("Avaliação: " + (formData.get("rating") || "-") + "/5");
    var treatment = formData.get("treatment");
    if (treatment) lines.push("Tratamento: " + treatment);
    lines.push("Depoimento: " + (formData.get("message") || "-"));
    return lines.join("\n");
  }

  if (testimonialForm) {
    testimonialForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Campo-armadilha preenchido = provável robô de spam. Finge
      // sucesso sem enviar nada a lugar nenhum.
      var honeypot = testimonialForm.querySelector('[name="_gotcha"]');
      if (honeypot && honeypot.value) {
        testimonialForm.reset();
        closeTestimonialModal();
        return;
      }

      if (!testimonialForm.checkValidity()) {
        testimonialForm.reportValidity();
        return;
      }

      tfSubmitBtn.disabled = true;
      tfSubmitBtn.textContent = "Enviando...";
      setFormFeedback("", "");

      var formData = new FormData(testimonialForm);

      function fallbackToWhatsApp(infoMessage) {
        var msg = buildWhatsAppMessageFromForm(formData);
        window.open(
          "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg),
          "_blank",
          "noopener"
        );
        setFormFeedback(infoMessage, "info");
        testimonialForm.reset();
        if (tfCharCounter) tfCharCounter.textContent = "0/" + (tfMessage.getAttribute("maxlength") || "600");
        tfSubmitBtn.disabled = false;
        tfSubmitBtn.textContent = "Enviar depoimento";
        trackEvent("testimonial_submit", { method: "whatsapp_fallback" });
      }

      // Endpoint ainda não configurado: usa o WhatsApp diretamente,
      // sem tentar nenhuma chamada de rede para um endereço inexistente.
      if (!FORMSPREE_ENDPOINT || FORMSPREE_ENDPOINT.indexOf("SEU_ID_FORMSPREE") !== -1) {
        fallbackToWhatsApp("Abrimos o WhatsApp com seu depoimento pronto — é só enviar por lá para a Dra. Auanny receber.");
        return;
      }

      fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" }
      })
        .then(function (response) {
          if (!response.ok) throw new Error("Formspree respondeu com erro");
          setFormFeedback("Obrigada! Seu depoimento foi recebido e será analisado antes de ser publicado.", "success");
          testimonialForm.reset();
          if (tfCharCounter) tfCharCounter.textContent = "0/" + (tfMessage.getAttribute("maxlength") || "600");
          tfSubmitBtn.disabled = false;
          tfSubmitBtn.textContent = "Enviar depoimento";
          trackEvent("testimonial_submit", { method: "formspree" });
        })
        .catch(function () {
          fallbackToWhatsApp("Não conseguimos enviar automaticamente — abrimos o WhatsApp para você enviar por lá.");
        });
    });
  }

  /* ---------------------------------------------------------
     Ano corrente no rodapé
  --------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();
