'use strict';

import Foo from './Foo';
import {Bar} from './Bar';

class UsingClasses {
  static value() {
    return Foo.value() + ' ' + Bar.value()
  }
}
export default UsingClasses;
