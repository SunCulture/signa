(function () {
  const ELEMENT_NAME = "signa-form";

  if (window.customElements.get(ELEMENT_NAME)) {
    return;
  }

  class SignaFormElement extends HTMLElement {
    connectedCallback() {
      this.render();
      this.onMessage = this.handleMessage.bind(this);
      window.addEventListener("message", this.onMessage);
    }

    disconnectedCallback() {
      window.removeEventListener("message", this.onMessage);
    }

    static get observedAttributes() {
      return ["data-src"];
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

      if (data.source !== "signa") {
        return;
      }

      if (data.type === "resize" && data.height) {
        this.iframe.style.height = `${Math.max(Number(data.height), 320)}px`;
        return;
      }

      const eventName = {
        completed: "completed",
        declined: "declined",
        init: "init",
        load: "load",
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
      const src = this.dataset.src || this.dataset.token || "";

      if (!src) {
        return;
      }

      if (!this.iframe) {
        this.iframe = document.createElement("iframe");
        this.iframe.setAttribute("title", "Signa signing form");
        this.iframe.setAttribute("allow", "clipboard-write; fullscreen");
        this.iframe.style.border = "0";
        this.iframe.style.display = "block";
        this.iframe.style.minHeight = "520px";
        this.iframe.style.width = "100%";
        this.appendChild(this.iframe);
      }

      this.iframe.src = this.buildFrameUrl(src);
    }

    buildFrameUrl(src) {
      const url = new URL(src, window.location.href);

      url.searchParams.set("embed", "true");

      for (const [key, value] of Object.entries(this.dataset)) {
        if (key === "src" || value === undefined) {
          continue;
        }

        url.searchParams.set(toKebabCase(key), value);
      }

      return url.toString();
    }
  }

  function toKebabCase(value) {
    return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  }

  window.customElements.define(ELEMENT_NAME, SignaFormElement);
})();
