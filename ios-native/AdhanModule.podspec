Pod::Spec.new do |s|
  s.name         = "AdhanModule"
  s.version      = "1.0.0"
  s.summary      = "AdhanModule for MyAdhan iOS"
  s.homepage     = "https://github.com/drogbinho/myadhan"
  s.license      = "MIT"
  s.author       = { "Elyes Nait-Liman" => "elyes.naitliman@gmail.com" }
  s.platform     = :ios, "13.0"
  s.source       = { :path => "." }
  s.source_files = "AdhanModule/**/*.{h,m,swift}"
  s.requires_arc = true
  s.swift_version = "5.0"

  s.dependency "React-Core"
  s.dependency "Adhan", "~> 1.3.0"
end

