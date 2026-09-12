#ifndef HEADLESSPACKAGE_H
#define HEADLESSPACKAGE_H

#pragma once

#include "generated/RNOHGeneratedPackage.h"

namespace rnoh {
class HeadlessPackage : public RNOHGeneratedPackage {
  public:
    using Super = RNOHGeneratedPackage;
    using Super::Super;
};
} // namespace rnoh
#endif //HEADLESSPACKAGE_H
