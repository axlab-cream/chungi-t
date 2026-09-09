      services: SERVICES.map((svc) => {
        const on = this.state.service === svc.id;
        return {
          title: svc.title,
          tagline: svc.tagline,
          price: svc.price,
          volume: svc.volume,
          badge: svc.badge,
          art: svc.art,
          family: svc.family,
          pick: on ? 'is-pick' : '',
          dot: on ? 'is-active' : '',
          select: () => this.setState({ service: svc.id }),
        };
      }),
      current: this.currentService(),
