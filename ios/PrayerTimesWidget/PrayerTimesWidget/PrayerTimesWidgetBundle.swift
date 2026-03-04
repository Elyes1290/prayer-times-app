//
//  PrayerTimesWidgetBundle.swift
//  PrayerTimesWidget
//
//  Created by Ilir Aliji on 16.02.2026.
//

import WidgetKit
import SwiftUI

@main
struct PrayerTimesWidgetBundle: WidgetBundle {
    var body: some Widget {
        PrayerTimesWidget()
        PrayerTimesWidgetControl()
        PrayerTimesWidgetLiveActivity()
    }
}
