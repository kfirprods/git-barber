class GitBarber < Formula
    include Language::Python::Virtualenv

    desc "CLI tool to manage Git branches and files"
    homepage "https://github.com/kfirprods/git-barber"
    url "https://files.pythonhosted.org/packages/source/g/git-barber/git-barber-0.1.0.tar.gz"
    sha256 "80917f77388f105a90d817340812ff30f1caec64400151f43dd901fea1a80bdb"

    depends_on "python"

    def install
      virtualenv_install_with_resources
    end

    test do
      system "#{bin}/git-barber", "--help"
    end
  end