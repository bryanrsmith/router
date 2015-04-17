import {History} from 'aurelia-history';
import {Container} from 'aurelia-dependency-injection';
import {AppRouter, PipelineProvider} from '../src/index';

class MockHistory extends History {
  activate(){}
  deactivate(){}
  navigate(){}
  navigateBack(){}
}

describe('the router', () => {
  let router;
  let history;
  beforeEach(() => {
    history = new MockHistory();
    router = new AppRouter(new Container(), history, new PipelineProvider(new Container()));
  });

  it('should have some tests', () => {
    expect(router).not.toBe(null);
  });

  describe('addRoute', () => {
    it('should register named routes', () => {
      const child = router.createChild(new Container()); 

      router.addRoute({ name: 'parent', route: 'parent', moduleId: 'parent' });
      child.addRoute({ name: 'child', route: 'child', moduleId: 'child' });

      expect(child.hasRoute('child')).toBe(true);
      expect(child.hasRoute('parent')).toBe(true);
      expect(child.hasOwnRoute('child')).toBe(true);
      expect(child.hasOwnRoute('parent')).toBe(false);

      expect(router.hasRoute('child')).toBe(false);
      expect(router.hasRoute('parent')).toBe(true);
      expect(router.hasOwnRoute('child')).toBe(false);
      expect(router.hasOwnRoute('parent')).toBe(true);
    });

    it('should add a route to navigation if it has a nav=true', () => {
      var testRoute = {};

      router.addRoute({ route: 'test', moduleId: 'test', title: 'Resume', nav: true }, testRoute);
      expect(router.navigation).toContain(testRoute);
    });

    it('should not add a route to navigation if it has a nav=false', () => {
      var testRoute = {};

      router.addRoute({ route: 'test', moduleId: 'test', title: 'Resume', nav: false }, testRoute);
      expect(router.navigation).not.toContain(testRoute);
    });

    it('should reject dynamic routes specifying nav=true with no href', () => {
      expect(() => router.addRoute({ route: 'test/:id', href: 'test', moduleId: 'test', nav: true })).not.toThrow();
      expect(() => router.addRoute({ route: 'test/:id', moduleId: 'test', nav: true })).toThrow();
    });
  });

  describe('generate', () => {
    it('should generate route URIs', () => {
      const child = router.createChild(new Container());
      child.baseUrl = 'child-router';
      
      router.configure(config => {
        config.map({ name: 'parent', route: 'parent', moduleId: './test' });
      });

      child.configure(config => {
        config.map({ name: 'child', route: 'child', moduleId: './test' });
      });

      expect(router.generate('parent')).toBe('#/parent');
      expect(child.generate('parent')).toBe('#/parent');
      expect(child.generate('child')).toBe('#/child-router/child');

      router.history._hasPushState = true;

      expect(router.generate('parent')).toBe('/parent');
      expect(child.generate('parent')).toBe('/parent');
      expect(child.generate('child')).toBe('/child-router/child');
    });

    it('should delegate to parent when not configured', () => {
      const child = router.createChild(new Container()); 

      router.configure(config => {
        config.map({ name: 'test', route: 'test/:id', moduleId: './test' });
      });

      expect(child.generate('test', { id: 1 })).toBe('#/test/1');
    });

    it('should delegate to parent when generating unknown route', () => {
      const child = router.createChild(new Container());

      router.configure(config => {
        config.map({ name: 'parent', route: 'parent/:id', moduleId: './test' });
      });

      child.configure(config => {
        config.map({ name: 'child', route: 'child/:id', moduleId: './test' });
      });

      expect(child.generate('child', { id: 1 })).toBe('#/child/1');
      expect(child.generate('parent', { id: 1 })).toBe('#/parent/1');
    });
  });

  describe('navigate', () => {
    it('should navigate to absolute paths', () => {
      const options = {};
      spyOn(history, 'navigate');

      const child = router.createChild(new Container());
      child.baseUrl = 'child-router';

      router.configure(config => {
        config.map({ name: 'parent', route: 'parent/:id', moduleId: './test' });
      });

      child.configure(config => {
        config.map({ name: 'child', route: 'child/:id', moduleId: './test' });
      });

      router.navigate('#/test1', options);
      expect(history.navigate).toHaveBeenCalledWith('#/test1', options);
      history.navigate.calls.reset();

      router.navigate('/test2', options);
      expect(history.navigate).toHaveBeenCalledWith('#/test2', options);
      history.navigate.calls.reset();
      
      router.navigate('test3', options);
      expect(history.navigate).toHaveBeenCalledWith('#/test3', options);
      history.navigate.calls.reset();

      child.navigate('#/test4', options);
      expect(history.navigate).toHaveBeenCalledWith('#/test4', options);
      history.navigate.calls.reset();
      
      child.navigate('/test5', options);
      expect(history.navigate).toHaveBeenCalledWith('#/test5', options);
      history.navigate.calls.reset();
      
      child.navigate('test6', options);
      expect(history.navigate).toHaveBeenCalledWith('#/child-router/test6', options);
      history.navigate.calls.reset();

      child.navigate('#/child-router/test7', options);
      expect(history.navigate).toHaveBeenCalledWith('#/child-router/test7', options);
      history.navigate.calls.reset();

      child.navigate('/child-router/test8', options);
      expect(history.navigate).toHaveBeenCalledWith('#/child-router/test8', options);
      history.navigate.calls.reset();

      child.navigate('child-router/test9', options);
      expect(history.navigate).toHaveBeenCalledWith('#/child-router/child-router/test9', options);
      history.navigate.calls.reset();
    });

    it('should navigate to named routes', () => {
      const options = {};
      spyOn(history, 'navigate');

      router.configure(config => {
        config.map({ name: 'test', route: 'test/:id', moduleId: './test' });
      });

      router.navigateToRoute('test', { id: 123 }, options);
      expect(history.navigate).toHaveBeenCalledWith('#/test/123', options);
    });
  });
});
