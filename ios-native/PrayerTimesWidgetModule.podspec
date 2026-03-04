Pod::Spec.new do |s|
  s.name         = "PrayerTimesWidgetModule"
  s.version      = "1.0.0"
  s.summary      = "Module natif iOS pour communiquer avec le Prayer Times Widget"
  s.homepage     = "https://myadhanapp.com"
  s.license      = "MIT"
  s.author       = { "MyAdhan" => "contact@myadhanapp.com" }
  s.platform     = :ios, "15.1"
  s.source       = { :path => "." }
  s.source_files = "PrayerTimesWidgetModule/**/*.{h,m,swift}"
  s.requires_arc = true
  s.swift_version = "5.0"
  
  s.dependency "React-Core"
end
