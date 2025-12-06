Pod::Spec.new do |s|
  s.name         = "QuranWidgetModule"
  s.version      = "1.0.0"
  s.summary      = "QuranWidgetModule for MyAdhan iOS"
  s.homepage     = "https://github.com/drogbinho/myadhan"
  s.license      = "MIT"
  s.author       = { "Elyes Nait-Liman" => "elyes.naitliman@gmail.com" }
  s.platform     = :ios, "13.0"
  s.source       = { :path => "." }
  s.source_files = "QuranWidget/**/*.{h,m,swift}"
  s.requires_arc = true
  s.swift_version = "5.0"

  s.dependency "React-Core"
end

