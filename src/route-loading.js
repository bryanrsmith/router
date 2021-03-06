import {activationStrategy, buildNavigationPlan} from './navigation-plan';

export class RouteLoader {
  loadRoute(router: any, config: any, navigationContext: any) {
    throw Error('Route loaders must implement "loadRoute(router, config, navigationContext)".');
  }
}

export class LoadRouteStep {
  static inject() { return [RouteLoader]; }

  constructor(routeLoader: RouteLoader) {
    this.routeLoader = routeLoader;
  }

  run(navigationContext: NavigationContext, next: Function) {
    return loadNewRoute(this.routeLoader, navigationContext)
      .then(next)
      .catch(next.cancel);
  }
}

export function loadNewRoute(routeLoader: RouteLoader, navigationContext: NavigationContext) {
  let toLoad = determineWhatToLoad(navigationContext);
  let loadPromises = toLoad.map((current) => loadRoute(
    routeLoader,
    current.navigationContext,
    current.viewPortPlan
    )
  );

  return Promise.all(loadPromises);
}

function determineWhatToLoad(navigationContext: NavigationContext, toLoad: Array<Object> = []) {
  let plan = navigationContext.plan;
  let next = navigationContext.nextInstruction;

  for (let viewPortName in plan) {
    let viewPortPlan = plan[viewPortName];

    if (viewPortPlan.strategy === activationStrategy.replace) {
      toLoad.push({
        viewPortPlan: viewPortPlan,
        navigationContext: navigationContext
      });

      if (viewPortPlan.childNavigationContext) {
        determineWhatToLoad(viewPortPlan.childNavigationContext, toLoad);
      }
    } else {
      let viewPortInstruction = next.addViewPortInstruction(
          viewPortName,
          viewPortPlan.strategy,
          viewPortPlan.prevModuleId,
          viewPortPlan.prevComponent
          );

      if (viewPortPlan.childNavigationContext) {
        viewPortInstruction.childNavigationContext = viewPortPlan.childNavigationContext;
        determineWhatToLoad(viewPortPlan.childNavigationContext, toLoad);
      }
    }
  }

  return toLoad;
}

function loadRoute(routeLoader: RouteLoader, navigationContext: NavigationContext, viewPortPlan: any) {
  let moduleId = viewPortPlan.config.moduleId;
  let next = navigationContext.nextInstruction;

  return loadComponent(routeLoader, navigationContext, viewPortPlan.config).then((component) => {
    let viewPortInstruction = next.addViewPortInstruction(
      viewPortPlan.name,
      viewPortPlan.strategy,
      moduleId,
      component
      );

    let childRouter = component.childRouter;
    if (childRouter) {
      let path = next.getWildcardPath();

      return childRouter.createNavigationInstruction(path, next)
        .then((childInstruction) => {
          let childNavigationContext = childRouter.createNavigationContext(childInstruction);
          viewPortPlan.childNavigationContext = childNavigationContext;

          return buildNavigationPlan(childNavigationContext)
            .then((childPlan) => {
              childNavigationContext.plan = childPlan;
              viewPortInstruction.childNavigationContext = childNavigationContext;

              return loadNewRoute(routeLoader, childNavigationContext);
            });
        });
    }
  });
}

function loadComponent(routeLoader: RouteLoader, navigationContext: NavigationContext, config: any) {
  let router = navigationContext.router;
  let lifecycleArgs = navigationContext.nextInstruction.lifecycleArgs;

  return routeLoader.loadRoute(router, config, navigationContext).then((component) => {
    let {bindingContext, childContainer} = component;
    component.router = router;
    component.config = config;

    if ('configureRouter' in bindingContext) {
      let childRouter = childContainer.getChildRouter();
      component.childRouter = childRouter;

      return childRouter.configure(c => bindingContext.configureRouter(c, childRouter, ...lifecycleArgs))
        .then(() => component);
    }

    return component;
  });
}
