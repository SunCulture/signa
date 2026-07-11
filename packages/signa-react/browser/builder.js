(function () {
  const ELEMENT_NAME = "signa-builder";

  if (window.customElements.get(ELEMENT_NAME)) {
    return;
  }

  class SignaBuilderElement extends HTMLElement {
    connectedCallback() {
      this.render();
      this.onMessage = this.handleMessage.bind(this);
      window.addEventListener("message", this.onMessage);
    }

    disconnectedCallback() {
      window.removeEventListener("message", this.onMessage);
    }

    static get observedAttributes() {
      return ["data-host", "data-src", "data-template", "data-token"];
    }

    attributeChangedCallback() {
      if (this.isConnected) {
        this.render();
      }
    }

    handleMessage(event) {
      if (event.source !== this.iframe?.contentWindow) {
        return;
      }

      const data = event.data || {};

      if (data.source !== "signa-builder") {
        return;
      }

      if (data.type === "resize" && data.height) {
        this.iframe.style.height = `${Math.max(Number(data.height), 520)}px`;
        return;
      }

      const eventName = {
        change: "change",
        load: "load",
        save: "save",
        send: "send",
        upload: "upload",
      }[data.type];

      if (eventName) {
        this.dispatchEvent(
          new CustomEvent(eventName, {
            bubbles: true,
            detail: data.detail,
          }),
        );
      }
    }

    render() {
      const src = this.getBuilderSrc();

      if (!src) {
        return;
      }

      if (!this.iframe) {
        this.iframe = document.createElement("iframe");
        this.iframe.setAttribute("title", "Signa template builder");
        this.iframe.setAttribute("allow", "clipboard-write; fullscreen");
        this.iframe.style.border = "0";
        this.iframe.style.display = "block";
        this.iframe.style.minHeight = "720px";
        this.iframe.style.width = "100%";
        this.appendChild(this.iframe);
      }

      this.iframe.src = src;
    }

    getBuilderSrc() {
      if (this.dataset.src) {
        return this.buildFrameUrl(this.dataset.src);
      }

      if (this.dataset.token) {
        return this.buildFrameUrl(`/templates/${this.dataset.token}/edit`);
      }

      if (!this.dataset.template) {
        return "";
      }

      try {
        const template = JSON.parse(this.dataset.template);

        if (!template.id) {
          return "";
        }

        return this.buildFrameUrl(`/templates/${template.id}/edit`);
      } catch {
        return "";
      }
    }

    buildFrameUrl(src) {
      const url = new URL(src, this.getFrameBaseUrl());

      url.searchParams.set("embed", "true");

      for (const [key, value] of Object.entries(this.dataset)) {
        if (["host", "src", "template"].includes(key) || value === undefined) {
          continue;
        }

        url.searchParams.set(toKebabCase(key), value);
      }

      return url.toString();
    }

    getFrameBaseUrl() {
      return this.dataset.host || window.location.href;
    }
  }

  function toKebabCase(value) {
    return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  window.customElements.define(ELEMENT_NAME, SignaBuilderElement);
})();
