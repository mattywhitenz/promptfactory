{ pkgs }: {
  deps = [
    pkgs.python39
    pkgs.gcc
  ];
  env = {
    PYTHONBIN = "${pkgs.python39}/bin/python3.9";
    LANG = "en_US.UTF-8";
  };
} 